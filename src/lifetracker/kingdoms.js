// Kingdoms automation rules — pure, side-effect-free against the
// passed-in `seats` array. Same logic powers the live lifetracker
// (via the state composable) and the End Game modal so both stay in
// sync.
//
// Expected seat shape:
//   { role, roleNotes, isDead, deathOverridden?, isWinner, deathTurn? }
// Missing fields are treated as their falsy defaults.

const LORD_ROLES = ['Lord', 'Zombie Lord', 'Clone Lord']

// Fixed role budgets for Kingdoms. If every other seat's role is
// known, the lone unknown can be derived by elimination.
const ROLE_BUDGETS = {
  5: { King: 1, Knight: 1, Goblin: 2, Lord: 1 },
  6: { King: 1, Knight: 1, Goblin: 2, Lord: 1, 'Clone Lord': 1 },
}

const isAlive = (s) => !s.isDead || s.deathOverridden

function kill(seat, turnCount, ctx) {
  // Respect explicit "not actually dead" overrides — the user has said
  // they're alive and we don't want a cascade to silently overwrite
  // that. They can flip the override off if they change their mind.
  if (seat.deathOverridden) return
  if (seat.isDead) return
  seat.isDead = true
  seat.deathOverridden = false
  if (seat.deathTurn === null || seat.deathTurn === undefined) {
    seat.deathTurn = turnCount
  }
  seat.cascadeKilled = true
  ctx.changed = true
}

function flagWinner(seat, ctx) {
  if (seat.isWinner) return
  seat.isWinner = true
  seat.cascadeWonBy = true
  ctx.changed = true
}

// Undo every effect that previous cascade passes added. Lets us
// re-derive cleanly from the user-set base state on each call — so
// when the user toggles "not actually dead" on a Lord, the King and
// Knight stop being flagged as winners and the Zombies the Lord
// dragged down come back too.
function revertPreviousCascade(seats) {
  for (const s of seats) {
    if (s.cascadeKilled) {
      s.cascadeKilled = false
      // Only undo the dead state if the user hasn't claimed it since:
      // checkDeath / setDead clear the flag when they take ownership,
      // so a still-set flag means cascade is still the only owner.
      if (s.isDead) {
        s.isDead = false
        s.deathOverridden = false
        s.deathTurn = null
      }
    }
    if (s.cascadeWonBy) {
      s.cascadeWonBy = false
      if (s.isWinner) s.isWinner = false
    }
  }
}

// If exactly one seat has no role and every other role at the table
// matches the budget with a single slot left over, the unknown seat
// must be that role — fill it in (and mark it revealed so the UI
// shows the badge). Seats the user explicitly cleared are skipped so
// a misclick-recover doesn't fight the user.
function autoRevealLastRole(seats, ctx) {
  const budget = ROLE_BUDGETS[seats.length]
  if (!budget) return
  const unknown = seats.filter(s => !s.role)
  if (unknown.length !== 1) return
  if (unknown[0].roleClearedByUser) return
  const counts = {}
  for (const s of seats) {
    if (!s.role) continue
    // 'Zombie Lord' is just the display name for 'Lord'.
    const r = s.role === 'Zombie Lord' ? 'Lord' : s.role
    counts[r] = (counts[r] || 0) + 1
  }
  for (const r of Object.keys(counts)) {
    if (counts[r] > (budget[r] || 0)) return
  }
  const missing = []
  for (const [r, total] of Object.entries(budget)) {
    const used = counts[r] || 0
    for (let i = 0; i < total - used; i++) missing.push(r)
  }
  if (missing.length !== 1) return
  unknown[0].role = missing[0]
  unknown[0].roleRevealed = true
  ctx.changed = true
}

// Walk the cascade chain to a fixed point. Each pass applies every
// rule once; later passes pick up consequences (e.g. Goblin win → all
// Lords killed → those Lords' minions killed in the next pass).
export function applyKingdomsCascades(seats, turnCount = 0) {
  if (!Array.isArray(seats) || !seats.length) return seats
  revertPreviousCascade(seats)
  let safety = 16
  let changed = true
  while (changed && safety-- > 0) {
    const ctx = { changed: false }

    autoRevealLastRole(seats, ctx)

    // Lord death → minions fall too.
    for (const seat of seats) {
      if (isAlive(seat)) continue
      let minionNote = null
      if (seat.role === 'Lord' || seat.role === 'Zombie Lord') minionNote = 'Zombie'
      else if (seat.role === 'Clone Lord') minionNote = 'Clone'
      else continue
      for (const other of seats) {
        if (other === seat) continue
        if (other.roleNotes !== minionNote) continue
        kill(other, turnCount, ctx)
      }
    }

    // King death → Knight loses with him.
    for (const seat of seats) {
      if (isAlive(seat)) continue
      if (seat.role !== 'King') continue
      for (const other of seats) {
        if (other === seat) continue
        if (other.role !== 'Knight') continue
        kill(other, turnCount, ctx)
      }
    }

    const kingDead = seats.some(s => s.role === 'King' && !isAlive(s))
    const kingAlive = seats.some(s => s.role === 'King' && isAlive(s))
    const goblins = seats.filter(s => s.role === 'Goblin')
    const goblinTeamLives = goblins.some(s => isAlive(s) && !s.roleNotes)
    const lordsAlive = seats.filter(s => LORD_ROLES.includes(s.role) && isAlive(s))

    // King dead → Goblins win (and Lords fall) OR lone Lord wins.
    if (kingDead) {
      if (goblinTeamLives) {
        for (const g of goblins) flagWinner(g, ctx)
        for (const lord of seats) {
          if (!LORD_ROLES.includes(lord.role)) continue
          kill(lord, turnCount, ctx)
        }
      } else if (lordsAlive.length === 1) {
        flagWinner(lordsAlive[0], ctx)
      }
    }

    // King alive → if every Goblin and every Lord is dead, the King
    // wins and the Knight wins with him (loyalty stands regardless of
    // whether the Knight survived). We require every non-King/Knight
    // seat to have a *known* role first — an unrevealed seat could
    // still be a Lord or Goblin who's alive and we'd be calling the
    // game too early.
    if (kingAlive) {
      const opposition = seats.filter(s => s.role !== 'King' && s.role !== 'Knight')
      const allKnown = opposition.length > 0 && opposition.every(s => s.role)
      const allDead = allKnown && opposition.every(s => !isAlive(s))
      if (allDead) {
        for (const s of seats) {
          if (s.role === 'King') flagWinner(s, ctx)
          else if (s.role === 'Knight') flagWinner(s, ctx)
        }
      }
    }

    changed = ctx.changed
  }
  return seats
}
