<script setup>
import { ref, provide, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLifetrackerState, turnNudgeThresholdMs } from '../composables/useLifetrackerState.js'
import { useNowTick } from '../composables/useNowTick.js'
import { findCycleWinner } from '../lifetracker/cycle.js'
import SetupScreen from '../components/lifetracker/SetupScreen.vue'
import CycleSetupPreview from '../components/lifetracker/CycleSetupPreview.vue'
import CycleDirectionsMap from '../components/lifetracker/CycleDirectionsMap.vue'
import TableLayout from '../components/lifetracker/TableLayout.vue'
import { LAYOUTS } from '../composables/useTableLayouts.js'
import DeckPicker from '../components/lifetracker/DeckPicker.vue'
import CommanderDamageModal from '../components/lifetracker/CommanderDamageModal.vue'
import RolePicker from '../components/lifetracker/RolePicker.vue'
import ExportModal from '../components/lifetracker/ExportModal.vue'
import ConcludeModal from '../components/lifetracker/ConcludeModal.vue'
import ConfirmDialog from '../components/lifetracker/ConfirmDialog.vue'
import Announcement from '../components/lifetracker/Announcement.vue'
import SettingsModal from '../components/lifetracker/SettingsModal.vue'

const router = useRouter()
const {
  state,
  settings,
  newGame,
  startGame,
  dealCycle,
  changeLife,
  changePoison,
  changeCommanderDamage,
  toggleDeathOverride,
  advanceTurn,
  saveGame,
  persistSetup,
  getCompletedGames,
  clearCompletedGames,
  resumeOrNew,
  discardSaved,
} = useLifetrackerState()

const now = useNowTick(1000)
const showSettings = ref(false)

// Turn-nudge: glow the cycle button once the round has been running
// longer than the per-round threshold (curve in
// useLifetrackerState.turnNudgeThresholdMs). Round 0 (pre-first-tap)
// always pulses — there's no timer to elapse and the whole point is to
// remind the table to actually start.
const turnNudgeThreshold = computed(() => {
  if (state.phase !== 'playing') return Infinity
  if (state.turnCount === 0) return Infinity
  return turnNudgeThresholdMs(state.turnCount, state.playerCount, settings)
})

const turnNudgeActive = computed(() => {
  if (state.phase !== 'playing') return false
  if (!settings.turnNudgeEnabled) return false
  if (state.turnCount === 0) return true
  if (!state.lastTurnAdvanceAt) return false
  const threshold = turnNudgeThreshold.value
  if (!isFinite(threshold)) return false
  const elapsed = now.value - new Date(state.lastTurnAdvanceAt).getTime()
  return elapsed >= threshold
})

// Fuse / radial — pass the per-round threshold and the round's start
// timestamp to GameMenuInline. Visuals run on a CSS animation in that
// component (compositor-thread, smooth, no JS load).
const fuseThresholdMs = computed(() => {
  if (!settings.turnNudgeEnabled) return 0
  if (state.phase !== 'playing') return 0
  if (state.turnCount === 0) return 0
  const v = turnNudgeThreshold.value
  return isFinite(v) ? v : 0
})

const fuseStartedAt = computed(() => state.lastTurnAdvanceAt)

function applySettingsUpdate(next) {
  Object.assign(settings, next)
}

provide('lifetracker', state)

// Keep screen awake while lifetracker is open
let wakeLock = null

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
    }
  } catch { /* user denied or not supported */ }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') requestWakeLock()
}

onMounted(() => {
  requestWakeLock()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  wakeLock?.release()
  wakeLock = null
})

const hasSaved = resumeOrNew()
const showResume = ref(hasSaved && state.phase !== 'setup')

function handleResume() {
  showResume.value = false
}

function handleNewGame() {
  discardSaved()
  showResume.value = false
}

function handleBack() {
  router.push('/dashboard')
}

function handleSetMode(mode, count, layoutId) {
  newGame(count, layoutId, mode)
}

function handleSetCount(count, layoutId) {
  newGame(count, layoutId, state.mode)
}

function handleSetLayout(layoutId) {
  state.layoutId = layoutId
}

function handleStart() {
  if (state.mode === 'cycle') {
    dealCycle()
    state.phase = 'cycle-preview'
  } else {
    startGame()
  }
}

function handleCycleRedeal(shapeOptions) {
  dealCycle(shapeOptions)
}

function handleCycleBegin() {
  startGame()
}

function handleCycleBack() {
  state.phase = 'setup'
}

const cycleMapOpen = ref(false)

function handleSetSeat(index, player, deck) {
  state.seats[index].player = player
  state.seats[index].deck = deck
}

// Mid-game seat editing
const editingSeatInGame = ref(null)

const usedPlayers = computed(() =>
  state.seats.filter(s => s.player).map(s => s.player)
)

function handleOpenSeat(i) {
  editingSeatInGame.value = i
}

function handleGameSeatSelect({ player, deck }) {
  state.seats[editingSeatInGame.value].player = player
  state.seats[editingSeatInGame.value].deck = deck
  editingSeatInGame.value = null
  persistSetup()
}

// Commander damage overlay
const cmdDamageTarget = ref(null)

function handleOpenCmdDamage(seatIndex) {
  cmdDamageTarget.value = seatIndex
}

function handleCmdDamageChange(targetSeat, fromSeat, cmdIndex, delta) {
  changeCommanderDamage(targetSeat, fromSeat, cmdIndex, delta)
}

function handleTogglePartners(_targetSeat, fromSeat) {
  const dealer = state.seats[fromSeat]
  dealer.hasPartners = !dealer.hasPartners
}

function handleCmdPoison(delta) {
  changePoison(cmdDamageTarget.value, delta)
}

function handleToggleDead() {
  const seat = state.seats[cmdDamageTarget.value]
  if (seat.isDead) {
    seat.isDead = false
    seat.deathOverridden = true
  } else {
    seat.isDead = true
    seat.deathOverridden = false
    if (seat.deathTurn === null) {
      seat.deathTurn = state.turnCount
    }
  }
}

function handleCmdTax(delta) {
  state.seats[cmdDamageTarget.value].commanderTax = Math.max(0, state.seats[cmdDamageTarget.value].commanderTax + delta)
}

// Turn advance with announcement
const announceText = ref(null)
const announceSubtitle = ref(null)

function handleAdvanceTurn(delta) {
  advanceTurn(delta)
  if (delta > 0) {
    announceSubtitle.value = null
    announceText.value = `Turn ${state.turnCount}`
  }
}

// Cycle win detection. The winner is derived live from seat state; an
// "I'm not actually dead" override revokes an elimination, which can
// also revoke a previously declared win — the watcher handles both
// directions: it sets isWinner + fires the announcement when a winner
// appears, and clears isWinner when the condition no longer holds.
const cycleWinnerIndex = computed(() => {
  if (state.mode !== 'cycle' || state.phase !== 'playing') return null
  return findCycleWinner(state.seats)
})

watch(cycleWinnerIndex, (next, prev) => {
  if (prev !== null && prev !== next && state.seats[prev]) {
    state.seats[prev].isWinner = false
  }
  if (next !== null && next !== prev && state.seats[next]) {
    state.seats[next].isWinner = true
    const winnerName = state.seats[next].player || `Seat ${next + 1}`
    announceSubtitle.value = 'claims the Throne!'
    announceText.value = winnerName
  }
})

// Role picker
const rolePickerSeat = ref(null)

function openRolePicker(seatIndex) {
  // If called from cmd modal, use that seat; otherwise use the passed index
  const idx = seatIndex !== undefined ? seatIndex : cmdDamageTarget.value
  rolePickerSeat.value = idx
}

function handleRoleSelect(role) {
  const seat = state.seats[rolePickerSeat.value]
  seat.role = role
  seat.roleRevealed = !!role
  // King gets 50 life
  if (role === 'King' && seat.life === 40) {
    seat.life = 50
  }
  rolePickerSeat.value = null
  cmdDamageTarget.value = null
}

// Death actions
function handleZombify(seatIndex) {
  const seat = state.seats[seatIndex]
  seat.life = 20
  seat.isDead = false
  seat.deathOverridden = true
  seat.roleNotes = 'Zombie'
}

const clearUndeadSeat = ref(null)

function handleClearUndead(seatIndex) {
  clearUndeadSeat.value = seatIndex
}

function confirmClearUndead() {
  const seat = state.seats[clearUndeadSeat.value]
  seat.roleNotes = null
  clearUndeadSeat.value = null
}

function cancelClearUndead() {
  clearUndeadSeat.value = null
}

function handleClone(seatIndex) {
  const seat = state.seats[seatIndex]
  seat.life = 20
  seat.isDead = false
  seat.deathOverridden = true
  seat.roleNotes = 'Clone'
}

function handleDeathRevealRole(seatIndex) {
  rolePickerSeat.value = seatIndex
}

// Conclude & export
const showConclude = ref(false)
const showExport = ref(false)
const completedGames = ref([])
const completedCycleGames = ref([])

function applyConcludeData({ seats, firstKO, gameEnd }) {
  for (let i = 0; i < state.seats.length; i++) {
    state.seats[i].role = seats[i].role
    state.seats[i].roleRevealed = !!seats[i].role
    state.seats[i].isWinner = seats[i].result === 'Win'
    state.seats[i].roleNotes = seats[i].roleNotes
  }
  state.concludeData = { firstKO, gameEnd }
}

function handleConcludeSave(data) {
  applyConcludeData(data)
  saveGame()
  showConclude.value = false
  const count = state.playerCount
  const layout = state.layoutId
  newGame(count, layout)
}

function handleConcludeSaveAndExport(data) {
  applyConcludeData(data)
  saveGame()
  showConclude.value = false
  const count = state.playerCount
  const layout = state.layoutId
  newGame(count, layout)
  handleShowExport()
}

function handleShowExport() {
  completedGames.value = getCompletedGames('kingdoms')
  completedCycleGames.value = getCompletedGames('cycle')
  showExport.value = true
}

function handleClearGames() {
  clearCompletedGames('kingdoms')
  completedGames.value = []
  if (!completedCycleGames.value.length) showExport.value = false
}

function handleClearCycleGames() {
  clearCompletedGames('cycle')
  completedCycleGames.value = []
  if (!completedGames.value.length) showExport.value = false
}
</script>

<template>
  <div class="lt-root">
    <!-- Resume prompt -->
    <div v-if="showResume" class="lt-overlay">
      <div class="lt-dialog">
        <h2 class="font-beleren text-mtg-gold text-xl mb-4">Game in Progress</h2>
        <p class="font-body text-mtg-text-dim mb-6">Resume the previous game or start fresh?</p>
        <div class="flex gap-3">
          <button @click="handleResume" class="lt-btn lt-btn-primary">Resume</button>
          <button @click="handleNewGame" class="lt-btn">New Game</button>
        </div>
      </div>
    </div>

    <!-- Setup phase -->
    <div v-else-if="state.phase === 'setup'" class="lt-setup">
      <SetupScreen
        :mode="state.mode"
        :player-count="state.playerCount"
        :layout-id="state.layoutId"
        @set-mode="handleSetMode"
        @set-count="handleSetCount"
        @set-layout="handleSetLayout"
        @start="handleStart"
        @export="handleShowExport"
        @back="handleBack"
      />
    </div>

    <!-- Cycle preview (House deal + starting player reveal) -->
    <CycleSetupPreview
      v-else-if="state.phase === 'cycle-preview'"
      :seats="state.seats"
      :starting-seat-index="state.startingSeatIndex"
      @redeal="handleCycleRedeal"
      @begin="handleCycleBegin"
      @back="handleCycleBack"
    />

    <!-- Playing phase -->
    <template v-else-if="state.phase === 'playing'">
      <TableLayout
        :layout-id="state.layoutId"
        :seats="state.seats"
        :turn-count="state.turnCount"
        :mode="state.mode"
        :starting-seat-index="state.startingSeatIndex"
        :nudge-active="turnNudgeActive"
        :fuse-threshold-ms="fuseThresholdMs"
        :fuse-started-at="fuseStartedAt"
        @change-life="(i, delta) => changeLife(i, delta)"
        @override="(i) => toggleDeathOverride(i)"
        @open-seat="handleOpenSeat"
        @open-cmd-damage="handleOpenCmdDamage"
        @reveal-role="handleDeathRevealRole"
        @zombify="handleZombify"
        @clone="handleClone"
        @clear-undead="handleClearUndead"
        @advance-turn="handleAdvanceTurn"
        @end-game="showConclude = true"
        @export="handleShowExport"
        @new-game="discardSaved"
        @back="handleBack"
        @open-cycle-map="cycleMapOpen = true"
        @open-settings="showSettings = true"
      />

      <!-- Cycle kill-list map (sigil-triggered overlay) -->
      <CycleDirectionsMap
        v-if="cycleMapOpen && state.mode === 'cycle'"
        :seats="state.seats"
        @close="cycleMapOpen = false"
      />

      <!-- Turn announcement -->
      <Announcement
        :text="announceText"
        :subtitle="announceSubtitle"
        @done="announceText = null; announceSubtitle = null"
      />

      <!-- Mid-game seat editor -->
      <DeckPicker
        v-if="editingSeatInGame !== null"
        :seat-index="editingSeatInGame"
        :current-player="state.seats[editingSeatInGame]?.player"
        :current-deck="state.seats[editingSeatInGame]?.deck"
        :used-players="usedPlayers"
        :rotated="LAYOUTS[state.layoutId].rows[0].seats.includes(editingSeatInGame)"
        @select="handleGameSeatSelect"
        @close="editingSeatInGame = null"
      />

      <!-- Commander damage overlay -->
      <CommanderDamageModal
        v-if="cmdDamageTarget !== null"
        :seat="state.seats[cmdDamageTarget]"
        :all-seats="state.seats"
        :layout-rows="LAYOUTS[state.layoutId].rows"
        :rotated="LAYOUTS[state.layoutId].rows[0].seats.includes(cmdDamageTarget)"
        :mode="state.mode"
        @change="handleCmdDamageChange"
        @toggle-partners="handleTogglePartners"
        @change-poison="handleCmdPoison"
        @change-tax="handleCmdTax"
        @reveal-role="openRolePicker(cmdDamageTarget)"
        @toggle-dead="handleToggleDead"
        @close="cmdDamageTarget = null"
      />

      <!-- Role picker (Kingdoms only) -->
      <RolePicker
        v-if="rolePickerSeat !== null && state.mode !== 'cycle'"
        :seat="state.seats[rolePickerSeat]"
        :all-seats="state.seats"
        :player-count="state.playerCount"
        :rotated="LAYOUTS[state.layoutId].rows[0].seats.includes(rolePickerSeat)"
        @select="handleRoleSelect"
        @close="rolePickerSeat = null"
      />

      <!-- Clear undead confirm -->
      <Teleport to="body">
        <ConfirmDialog
          v-if="clearUndeadSeat !== null"
          :title="`Clear ${state.seats[clearUndeadSeat]?.roleNotes}`"
          :message="`Remove ${state.seats[clearUndeadSeat]?.roleNotes} status from ${state.seats[clearUndeadSeat]?.player}?`"
          confirm-label="Clear"
          :danger="true"
          :rotated="LAYOUTS[state.layoutId].rows[0].seats.includes(clearUndeadSeat)"
          @confirm="confirmClearUndead"
          @cancel="cancelClearUndead"
        />
      </Teleport>

      <!-- Conclude modal -->
      <ConcludeModal
        v-if="showConclude"
        :seats="state.seats"
        :turn-count="state.turnCount"
        :mode="state.mode"
        @save="handleConcludeSave"
        @save-and-export="handleConcludeSaveAndExport"
        @close="showConclude = false"
      />

      <!-- Session settings (opened from the battle menu) -->
      <SettingsModal
        v-if="showSettings"
        :settings="settings"
        @update="applySettingsUpdate"
        @close="showSettings = false"
      />

    </template>

    <!-- Export modal (available in any phase) -->
    <ExportModal
      v-if="showExport"
      :games="completedGames"
      :cycle-games="completedCycleGames"
      @close="showExport = false"
      @clear-games="handleClearGames"
      @clear-cycle-games="handleClearCycleGames"
    />
  </div>
</template>

<style scoped>
.lt-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #1a1612;
  overflow: hidden;
}

.lt-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1612;
  z-index: 110;
}

.lt-setup {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  background: #1a1612;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 40px;
}

.lt-dialog {
  text-align: center;
  padding: 2rem;
  max-width: 360px;
}

.lt-btn {
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  padding: 0.75rem 2rem;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  cursor: pointer;
  transition: all 0.2s;
}

.lt-btn:hover {
  background: #2a2520;
  border-color: #c9a54e66;
}

.lt-btn-primary {
  background: #c9a54e22;
  border-color: #c9a54e66;
  color: #c9a54e;
}

.lt-btn-primary:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
}


</style>
