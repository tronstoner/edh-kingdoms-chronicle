<script setup>
import { ref, provide, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLifetrackerState } from '../composables/useLifetrackerState.js'
import SetupScreen from '../components/lifetracker/SetupScreen.vue'
import TableLayout from '../components/lifetracker/TableLayout.vue'
import { LAYOUTS } from '../composables/useTableLayouts.js'
import DeckPicker from '../components/lifetracker/DeckPicker.vue'
import CommanderDamageModal from '../components/lifetracker/CommanderDamageModal.vue'
import RolePicker from '../components/lifetracker/RolePicker.vue'
import GameMenu from '../components/lifetracker/GameMenu.vue'
import ExportModal from '../components/lifetracker/ExportModal.vue'

const router = useRouter()
const {
  state,
  newGame,
  startGame,
  changeLife,
  changePoison,
  changeCommanderDamage,
  toggleDeathOverride,
  advanceTurn,
  finishGame,
  resumeOrNew,
  discardSaved,
} = useLifetrackerState()

provide('lifetracker', state)

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
  router.push('/')
}

function handleSetCount(count, layoutId) {
  newGame(count, layoutId)
}

function handleSetLayout(layoutId) {
  state.layoutId = layoutId
}

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
}

// Commander damage overlay
const cmdDamageTarget = ref(null)

function handleOpenCmdDamage(seatIndex) {
  cmdDamageTarget.value = seatIndex
}

function handleCmdDamageChange(targetSeat, fromSeat, cmdIndex, delta) {
  changeCommanderDamage(targetSeat, fromSeat, cmdIndex, delta)
}

function handleTogglePartners(targetSeat, fromSeat) {
  const dmg = state.seats[targetSeat].commanderDamage[fromSeat]
  dmg.hasPartners = !dmg.hasPartners
  if (!dmg.hasPartners) dmg.cmd2 = 0
}

function handleCmdPoison(delta) {
  changePoison(cmdDamageTarget.value, delta)
}

function handleCmdTax(delta) {
  state.seats[cmdDamageTarget.value].commanderTax = Math.max(0, state.seats[cmdDamageTarget.value].commanderTax + delta)
}

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
}

// Death actions
function handleZombify(seatIndex) {
  const seat = state.seats[seatIndex]
  seat.life = 20
  seat.isDead = false
  seat.deathOverridden = true
  seat.roleNotes = 'Zombie'
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

// Export
const showExport = ref(false)

function handleFinishGame() {
  finishGame()
  showExport.value = false
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
        :seats="state.seats"
        :player-count="state.playerCount"
        :layout-id="state.layoutId"
        @set-count="handleSetCount"
        @set-layout="handleSetLayout"
        @set-seat="handleSetSeat"
        @start="startGame"
        @back="handleBack"
      />
    </div>

    <!-- Playing phase -->
    <template v-else-if="state.phase === 'playing'">
      <TableLayout
        :layout-id="state.layoutId"
        :seats="state.seats"
        @change-life="(i, delta) => changeLife(i, delta)"
        @override="(i) => toggleDeathOverride(i)"
        @open-seat="handleOpenSeat"
        @open-cmd-damage="handleOpenCmdDamage"
        @reveal-role="handleDeathRevealRole"
        @zombify="handleZombify"
        @clone="handleClone"
      />

      <!-- Mid-game seat editor -->
      <DeckPicker
        v-if="editingSeatInGame !== null"
        :seat-index="editingSeatInGame"
        :current-player="state.seats[editingSeatInGame]?.player"
        :current-deck="state.seats[editingSeatInGame]?.deck"
        :used-players="usedPlayers"
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
        @change="handleCmdDamageChange"
        @toggle-partners="handleTogglePartners"
        @change-poison="handleCmdPoison"
        @change-tax="handleCmdTax"
        @reveal-role="openRolePicker(cmdDamageTarget)"
        @close="cmdDamageTarget = null"
      />

      <!-- Role picker -->
      <RolePicker
        v-if="rolePickerSeat !== null"
        :seat="state.seats[rolePickerSeat]"
        :all-seats="state.seats"
        :player-count="state.playerCount"
        @select="handleRoleSelect"
        @close="rolePickerSeat = null"
      />

      <!-- Export modal -->
      <ExportModal
        v-if="showExport"
        :seats="state.seats"
        :turn-count="state.turnCount"
        @close="showExport = false"
        @finish="handleFinishGame"
      />

      <!-- Game menu -->
      <GameMenu
        :turn-count="state.turnCount"
        @advance-turn="advanceTurn"
        @export="showExport = true"
        @new-game="discardSaved"
        @back="handleBack"
      />
    </template>
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
