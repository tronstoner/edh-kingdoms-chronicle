import { reactive, watch } from 'vue'

const LS_CURRENT = 'edhlog-lt-current'
const LS_COMPLETED = 'edhlog-lt-completed'

function createSeat(index, playerCount) {
  const commanderDamage = {}
  for (let i = 0; i < playerCount; i++) {
    if (i !== index) {
      commanderDamage[i] = { cmd1: 0, cmd2: 0, hasPartners: false }
    }
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
    isDead: false,
    deathOverridden: false,
    deathTurn: null,
    isWinner: false,
    history: [],
  }
}

function createGame(playerCount, layoutId) {
  const seats = []
  for (let i = 0; i < playerCount; i++) {
    seats.push(createSeat(i, playerCount))
  }
  return {
    id: Date.now().toString(36),
    phase: 'setup',
    playerCount,
    layoutId,
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
    Object.assign(state, fresh)
  }

  function startGame() {
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
    const key = cmdIndex === 2 ? 'cmd2' : 'cmd1'
    seat.commanderDamage[fromSeat][key] = Math.max(0, seat.commanderDamage[fromSeat][key] + delta)
    // Commander damage also reduces life
    seat.life -= delta
    seat.history.push({
      timestamp: Date.now(),
      delta: -delta,
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

  function advanceTurn() {
    state.turnCount++
  }

  function finishGame() {
    state.phase = 'finished'
    saveCompleted(JSON.parse(JSON.stringify(state)))
    clearCurrent()
  }

  function resumeOrNew() {
    return saved !== null
  }

  function discardSaved() {
    clearCurrent()
    const fresh = createGame(5, '5-3t2b')
    Object.assign(state, fresh)
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
    finishGame,
    resumeOrNew,
    discardSaved,
    checkDeath,
  }
}
