import { reactive, watch } from 'vue'

const LS_CURRENT = 'edhlog-lt-current'
const LS_COMPLETED = 'edhlog-lt-completed'
const LS_LAST_SETUP = 'edhlog-lt-last-setup'

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

function loadLastSetup() {
  try {
    const raw = localStorage.getItem(LS_LAST_SETUP)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveLastSetup(state) {
  const setup = {
    playerCount: state.playerCount,
    layoutId: state.layoutId,
    seats: state.seats.map(s => ({
      player: s.player,
      deck: s.deck,
    })),
  }
  localStorage.setItem(LS_LAST_SETUP, JSON.stringify(setup))
}

function createGame(playerCount, layoutId) {
  const lastSetup = loadLastSetup()
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
    phase: 'setup',
    playerCount,
    layoutId: (lastSetup && lastSetup.playerCount === playerCount) ? lastSetup.layoutId : layoutId,
    turnCount: 0,
    startTime: new Date().toISOString(),
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

function loadCompleted() {
  try {
    const raw = localStorage.getItem(LS_COMPLETED)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCompleted(game) {
  const list = loadCompleted()
  list.push(game)
  localStorage.setItem(LS_COMPLETED, JSON.stringify(list))
}

export function useLifetrackerState() {
  const saved = loadCurrent()
  const state = reactive(saved || createGame(5, '5-3t2b'))

  let saveTimeout = null
  watch(() => state, () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveCurrent(state), 500)
  }, { deep: true })

  function newGame(playerCount, layoutId) {
    const fresh = createGame(playerCount, layoutId)
    // Clear seats array and repopulate to maintain reactivity
    state.seats.splice(0, state.seats.length, ...fresh.seats)
    state.id = fresh.id
    state.phase = fresh.phase
    state.playerCount = fresh.playerCount
    state.layoutId = fresh.layoutId
    state.turnCount = fresh.turnCount
    state.startTime = fresh.startTime
    if (fresh.concludeData) {
      state.concludeData = fresh.concludeData
    } else {
      delete state.concludeData
    }
  }

  function startGame() {
    saveLastSetup(state)
    state.phase = 'playing'
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
      seat.history.push({
        timestamp: Date.now(),
        delta: lifeBatch[seatIndex].delta,
        newTotal: lifeBatch[seatIndex].newTotal,
        source: 'life',
      })
      delete lifeBatch[seatIndex]
    }, 2000)
    checkDeath(seat)
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
  }

  function saveGame() {
    saveLastSetup(state)
    saveCompleted(JSON.parse(JSON.stringify(state)))
  }

  function getCompletedGames() {
    return loadCompleted()
  }

  function clearCompletedGames() {
    localStorage.removeItem(LS_COMPLETED)
    localStorage.removeItem(LS_LAST_SETUP)
    localStorage.removeItem('edhlog-lt-session-guests')
  }

  function persistSetup() {
    saveLastSetup(state)
  }

  function resumeOrNew() {
    return saved !== null
  }

  function discardSaved() {
    clearCurrent()
    newGame(5, '5-3t2b')
  }

  return {
    state,
    newGame,
    startGame,
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
    resumeOrNew,
    discardSaved,
    checkDeath,
  }
}
