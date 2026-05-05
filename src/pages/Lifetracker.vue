<script setup>
import { ref, provide, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLifetrackerState } from '../composables/useLifetrackerState.js'
import SetupScreen from '../components/lifetracker/SetupScreen.vue'
import TableLayout from '../components/lifetracker/TableLayout.vue'
import { LAYOUTS } from '../composables/useTableLayouts.js'
import DeckPicker from '../components/lifetracker/DeckPicker.vue'
import CommanderDamageModal from '../components/lifetracker/CommanderDamageModal.vue'

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
        @change="handleCmdDamageChange"
        @toggle-partners="handleTogglePartners"
        @change-poison="handleCmdPoison"
        @change-tax="handleCmdTax"
        @close="cmdDamageTarget = null"
      />

      <!-- Floating menu button -->
      <div class="lt-menu-float">
        <button @click="handleBack" class="lt-menu-btn" title="Back">
          <span class="text-lg">&larr;</span>
        </button>
        <div class="lt-turn font-beleren">
          T{{ state.turnCount }}
        </div>
        <button @click="advanceTurn" class="lt-menu-btn" title="Next turn">
          <span class="text-lg">&#x27F3;</span>
        </button>
      </div>
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
  border-radius: 6px;
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

.lt-menu-float {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: #231f1aee;
  border: 1px solid #3d3529;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  z-index: 120;
}

.lt-menu-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #8a7e66;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 1.3rem;
}

.lt-menu-btn:hover {
  color: #c9a54e;
  background: #c9a54e11;
}

.lt-turn {
  color: #c9a54e;
  font-size: 1.1rem;
  min-width: 40px;
  text-align: center;
}
</style>
