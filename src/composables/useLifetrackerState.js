import { reactive, watch } from 'vue'
import { assignHousesForShapes, randomStart, DEFAULT_SHAPE_OPTIONS } from '../lifetracker/cycle.js'

const LS_CURRENT = 'edhlog-lt-current'
const LS_COMPLETED = 'edhlog-lt-completed'
const LS_COMPLETED_CYCLE = 'edhlog-lt-completed-cycle'
const LS_LAST_SETUP = 'edhlog-lt-last-setup'
const LS_CYCLE_SHAPES = 'edhlog-lt-cycle-shapes'
const SS_CYCLE_MANUAL = 'edhlog-lt-cycle-manual'
const LS_SETTINGS = 'edhlog-lt-settings'

// Session settings — persisted across games, separate from the game state.
// Currently just the turn-nudge config but the modal is designed to grow.
export const DEFAULT_SETTINGS = {
  turnNudgeEnabled: true,
  // Show the fuse ring + radial pie countdown leading up to the nudge.
  // When false, the pulse still fires at threshold-elapsed but no visual
  // timer ticks on the button beforehand.
  turnNudgeShowFuse: true,
  // Cap on minutes-per-player at which the nudge fires. Round R is a
  // fraction of this cap (10/20/40/60/80/100% for R1–R6+).
  turnNudgeMaxMinutesPerPlayer: 5,
  // Visual theme — 'bright' is the default: white text + more saturated
  // deck gradients, tuned for low-contrast tablets / bright rooms.
  // 'classic' keeps the muted parchment/gold look used elsewhere in the
  // app for users who prefer the old aesthetic.
  theme: 'bright',
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS)
    const parsed = raw ? JSON.parse(raw) : null
    return { ...DEFAULT_SETTINGS, ...(parsed || {}) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings))
  } catch {
    // ignore quota errors
  }
}

// ms before the turn-cycle button should start nudging, given the
// current round, player count, and the user's max-minutes cap.
// Returns Infinity if disabled.
//
// Per-round factor (fraction of the cap), shaped so round 1 is a
// quick check and the curve hits the cap by round 6:
//   R1 = 0.10   (default cap 5 → 0.5 min/player)
//   R2 = 0.20            → 1
//   R3 = 0.40            → 2
//   R4 = 0.60            → 3
//   R5 = 0.80            → 4
//   R6+ = 1.00 (cap)     → 5
// The factor multiplies the cap setting, so e.g. cap = 3 scales the
// whole curve down (R1 = 0.3 min/player, R6+ = 3) and cap = 10 scales
// it up (R1 = 1 min/player, R6+ = 10).
export function turnNudgeThresholdMs(turnCount, playerCount, settings) {
  if (!settings || !settings.turnNudgeEnabled) return Infinity
  // turnCount=0 → about to start round 1; otherwise we're inside round `turnCount`.
  const round = Math.max(1, turnCount || 1)
  // Factor matches the original-curve ratios at default cap=5:
  // (max(0.5, R-1)) / 5, clamped to 1.0 from R6 onward.
  const factor = Math.min(1, Math.max(0.5, round - 1) / 5)
  const cap = Math.max(1, Number(settings.turnNudgeMaxMinutesPerPlayer) || 5)
  const minutesPerPlayer = cap * factor
  return minutesPerPlayer * playerCount * 60_000
}

export function loadCycleShapeOptions() {
  try {
    const raw = localStorage.getItem(LS_CYCLE_SHAPES)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed) return JSON.parse(JSON.stringify(DEFAULT_SHAPE_OPTIONS))
    return {
      diagonal:   { ...DEFAULT_SHAPE_OPTIONS.diagonal,   ...(parsed.diagonal   || {}) },
      vertical:   { ...DEFAULT_SHAPE_OPTIONS.vertical,   ...(parsed.vertical   || {}) },
      horizontal: { ...DEFAULT_SHAPE_OPTIONS.horizontal, ...(parsed.horizontal || {}) },
    }
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_SHAPE_OPTIONS))
  }
}

export function saveCycleShapeOptions(opts) {
  try {
    localStorage.setItem(LS_CYCLE_SHAPES, JSON.stringify(opts))
  } catch {
    // ignore quota errors
  }
}

export function loadCycleManualMode() {
  try {
    return sessionStorage.getItem(SS_CYCLE_MANUAL) === '1'
  } catch {
    return false
  }
}

export function saveCycleManualMode(on) {
  try {
    if (on) sessionStorage.setItem(SS_CYCLE_MANUAL, '1')
    else sessionStorage.removeItem(SS_CYCLE_MANUAL)
  } catch {
    // ignore quota errors
  }
}

function createSeat(index, playerCount) {
  const commanderDamage = {}
  for (let i = 0; i < playerCount; i++) {
    commanderDamage[i] = { cmd1: 0, cmd2: 0 }
  }
  return {
    index,
    player: null,
    deck: null,
    role: null,
    roleRevealed: false,
    house: null,
    life: 40,
    poison: 0,
    poisonEnabled: false,
    commanderTax: 0,
    commanderDamage,
    hasPartners: false,
    isDead: false,
    deathOverridden: false,
    deathTurn: null,
    isWinner: false,
    roleNotes: null,
    history: [],
  }
}

function loadLastSetup(mode) {
  try {
    const raw = localStorage.getItem(LS_LAST_SETUP)
    const all = raw ? JSON.parse(raw) : null
    if (!all) return null
    // Legacy: pre-mode setups were a single object (Kingdoms).
    if (!all.byMode) {
      return mode === 'kingdoms' ? all : null
    }
    return all.byMode[mode] || null
  } catch { return null }
}

function saveLastSetup(state) {
  const entry = {
    playerCount: state.playerCount,
    layoutId: state.layoutId,
    seats: state.seats.map(s => ({
      player: s.player,
      deck: s.deck,
    })),
  }
  let all
  try {
    const raw = localStorage.getItem(LS_LAST_SETUP)
    all = raw ? JSON.parse(raw) : {}
  } catch { all = {} }
  if (!all.byMode) all = { byMode: {} }
  all.byMode[state.mode] = entry
  localStorage.setItem(LS_LAST_SETUP, JSON.stringify(all))
}

function createGame(playerCount, layoutId, mode = 'kingdoms') {
  const lastSetup = loadLastSetup(mode)
  const seats = []
  for (let i = 0; i < playerCount; i++) {
    const seat = createSeat(i, playerCount)
    if (lastSetup && lastSetup.seats[i]) {
      seat.player = lastSetup.seats[i].player
      seat.deck = lastSetup.seats[i].deck
    }
    seats.push(seat)
  }
  return {
    id: Date.now().toString(36),
    mode,
    phase: 'setup',
    playerCount,
    layoutId: (lastSetup && lastSetup.playerCount === playerCount) ? lastSetup.layoutId : layoutId,
    turnCount: 0,
    startTime: new Date().toISOString(),
    // Timestamp of the last advanceTurn (or startGame). Drives the
    // turn-nudge pulse — elapsed since this anchors the threshold check.
    lastTurnAdvanceAt: null,
    startingSeatIndex: null,
    seats,
  }
}

function loadCurrent() {
  try {
    const raw = localStorage.getItem(LS_CURRENT)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveCurrent(state) {
  localStorage.setItem(LS_CURRENT, JSON.stringify(state))
}

function clearCurrent() {
  localStorage.removeItem(LS_CURRENT)
}

function completedKey(mode) {
  return mode === 'cycle' ? LS_COMPLETED_CYCLE : LS_COMPLETED
}

function loadCompleted(mode) {
  try {
    const raw = localStorage.getItem(completedKey(mode))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCompleted(game) {
  const key = completedKey(game.mode)
  const list = loadCompleted(game.mode)
  list.push(game)
  localStorage.setItem(key, JSON.stringify(list))
}

export function useLifetrackerState() {
  const saved = loadCurrent()
  if (saved && !saved.mode) saved.mode = 'kingdoms'
  // Back-fill legacy state from before lastTurnAdvanceAt existed.
  if (saved && saved.lastTurnAdvanceAt === undefined) saved.lastTurnAdvanceAt = null
  const state = reactive(saved || createGame(5, '5-3t2b', 'kingdoms'))

  const settings = reactive(loadSettings())
  watch(settings, (val) => saveSettings({ ...val }), { deep: true })

  let saveTimeout = null
  watch(() => state, () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveCurrent(state), 500)
  }, { deep: true })

  function newGame(playerCount, layoutId, mode) {
    const nextMode = mode || state.mode || 'kingdoms'
    const fresh = createGame(playerCount, layoutId, nextMode)
    // Clear seats array and repopulate to maintain reactivity
    state.seats.splice(0, state.seats.length, ...fresh.seats)
    state.id = fresh.id
    state.mode = fresh.mode
    state.phase = fresh.phase
    state.playerCount = fresh.playerCount
    state.layoutId = fresh.layoutId
    state.turnCount = fresh.turnCount
    state.startTime = fresh.startTime
    state.lastTurnAdvanceAt = fresh.lastTurnAdvanceAt
    state.startingSeatIndex = fresh.startingSeatIndex
    if (fresh.concludeData) {
      state.concludeData = fresh.concludeData
    } else {
      delete state.concludeData
    }
  }

  function dealCycle(shapeOptions) {
    if (state.mode !== 'cycle') return
    const houses = assignHousesForShapes(shapeOptions || loadCycleShapeOptions())
    state.seats.forEach((seat, i) => {
      seat.house = houses[i]
    })
    // Houses only — the starting seat is rolled separately (on initial
    // setup → cycle-preview transition, or via Roll Start). Re-deal must
    // not change who goes first.
  }

  function swapCycleHouses(a, b) {
    if (state.mode !== 'cycle') return
    if (a === b || !state.seats[a] || !state.seats[b]) return
    const tmp = state.seats[a].house
    state.seats[a].house = state.seats[b].house
    state.seats[b].house = tmp
    if (state.startingSeatIndex === a) state.startingSeatIndex = b
    else if (state.startingSeatIndex === b) state.startingSeatIndex = a
  }

  function rollStartingSeat() {
    if (state.mode !== 'cycle') return
    state.startingSeatIndex = randomStart(state.seats.length)
  }

  function startGame() {
    saveLastSetup(state)
    state.phase = 'playing'
    state.lastTurnAdvanceAt = new Date().toISOString()
  }

  function checkDeath(seat) {
    const totalCmdDmg = Object.values(seat.commanderDamage)
    const lethalCmd = totalCmdDmg.some(d => d.cmd1 >= 21 || d.cmd2 >= 21)
    const shouldDie = seat.life <= 0 || seat.poison >= 10 || lethalCmd
    // Override is temporary — once life is no longer lethal, clear it
    // so death can trigger normally again next time
    if (seat.deathOverridden) {
      if (!shouldDie) {
        seat.deathOverridden = false
      }
      return
    }
    if (shouldDie && !seat.isDead) {
      seat.isDead = true
      if (seat.deathTurn === null) {
        seat.deathTurn = state.turnCount
      }
    }
  }

  const lifeBatch = {}

  function changeLife(seatIndex, delta) {
    const seat = state.seats[seatIndex]
    seat.life += delta
    // Batch rapid changes into one history entry (2s window)
    if (lifeBatch[seatIndex]) {
      lifeBatch[seatIndex].delta += delta
      lifeBatch[seatIndex].newTotal = seat.life
      clearTimeout(lifeBatch[seatIndex].timer)
    } else {
      lifeBatch[seatIndex] = { delta, newTotal: seat.life, timer: null }
    }
    lifeBatch[seatIndex].timer = setTimeout(() => {
      const batch = lifeBatch[seatIndex]
      const oldLife = seat.life - batch.delta
      seat.history.push({
        timestamp: Date.now(),
        delta: batch.delta,
        newTotal: batch.newTotal,
        source: 'life',
      })
      delete lifeBatch[seatIndex]
      // If life crossed from alive into lethal during this batch, drop any
      // active override so death re-triggers (e.g. revived zombie taking lethal).
      if (oldLife > 0 && seat.life <= 0 && seat.deathOverridden) {
        seat.deathOverridden = false
      }
      checkDeath(seat)
    }, 2000)
  }

  function changePoison(seatIndex, delta) {
    const seat = state.seats[seatIndex]
    seat.poison = Math.max(0, seat.poison + delta)
    seat.history.push({
      timestamp: Date.now(),
      delta,
      newTotal: seat.poison,
      source: 'poison',
    })
    checkDeath(seat)
  }

  function changeCommanderDamage(targetSeat, fromSeat, cmdIndex, delta) {
    const seat = state.seats[targetSeat]
    if (!seat.commanderDamage[fromSeat]) return
    const key = cmdIndex === 2 ? 'cmd2' : 'cmd1'
    const prev = seat.commanderDamage[fromSeat][key]
    const next = Math.max(0, prev + delta)
    const actualDelta = next - prev
    if (actualDelta === 0) return
    seat.commanderDamage[fromSeat][key] = next
    // Commander damage also reduces life
    seat.life -= actualDelta
    seat.history.push({
      timestamp: Date.now(),
      delta: -actualDelta,
      newTotal: seat.life,
      source: 'commander',
      fromSeat,
    })
    checkDeath(seat)
  }

  function toggleDeathOverride(seatIndex) {
    const seat = state.seats[seatIndex]
    seat.deathOverridden = !seat.deathOverridden
    if (seat.deathOverridden) {
      seat.isDead = false
    } else {
      checkDeath(seat)
    }
  }

  function setWinner(seatIndex) {
    state.seats[seatIndex].isWinner = !state.seats[seatIndex].isWinner
  }

  function setDead(seatIndex) {
    const seat = state.seats[seatIndex]
    seat.isDead = !seat.isDead
    if (seat.isDead && seat.deathTurn === null) {
      seat.deathTurn = state.turnCount
    }
  }

  function advanceTurn(delta = 1) {
    state.turnCount = Math.max(0, state.turnCount + delta)
    state.lastTurnAdvanceAt = new Date().toISOString()
  }

  function saveGame() {
    saveLastSetup(state)
    saveCompleted(JSON.parse(JSON.stringify(state)))
  }

  function getCompletedGames(mode) {
    return loadCompleted(mode || state.mode)
  }

  function clearCompletedGames(mode) {
    if (mode) {
      localStorage.removeItem(completedKey(mode))
    } else {
      localStorage.removeItem(LS_COMPLETED)
      localStorage.removeItem(LS_COMPLETED_CYCLE)
      localStorage.removeItem(LS_LAST_SETUP)
      localStorage.removeItem('edhlog-lt-session-guests')
    }
  }

  function persistSetup() {
    saveLastSetup(state)
  }

  function clearSeats() {
    const isCycle = state.mode === 'cycle'
    const fresh = state.seats.map((seat, i) => {
      const s = createSeat(i, state.playerCount)
      if (isCycle) s.house = seat.house
      return s
    })
    state.seats.splice(0, state.seats.length, ...fresh)
    state.turnCount = 0
    state.startTime = new Date().toISOString()
    state.lastTurnAdvanceAt = new Date().toISOString()
    if (!isCycle) state.startingSeatIndex = null
    delete state.concludeData
  }

  function resumeOrNew() {
    return saved !== null
  }

  function discardSaved() {
    clearCurrent()
    const mode = state.mode || 'kingdoms'
    const count = mode === 'cycle' ? 4 : (state.playerCount === 6 ? 6 : 5)
    const layoutId = mode === 'cycle' ? '4-2t2b' : (count === 6 ? '6-3t3b' : '5-3t2b')
    newGame(count, layoutId, mode)
  }

  return {
    state,
    settings,
    newGame,
    startGame,
    dealCycle,
    swapCycleHouses,
    rollStartingSeat,
    changeLife,
    changePoison,
    changeCommanderDamage,
    toggleDeathOverride,
    setWinner,
    setDead,
    advanceTurn,
    saveGame,
    getCompletedGames,
    clearCompletedGames,
    persistSetup,
    clearSeats,
    resumeOrNew,
    discardSaved,
    checkDeath,
  }
}
