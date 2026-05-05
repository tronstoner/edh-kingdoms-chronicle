<script setup>
import { ref, computed } from 'vue'
import { defaultLayout } from '../../composables/useTableLayouts.js'
import LayoutPicker from './LayoutPicker.vue'
import DeckPicker from './DeckPicker.vue'

const props = defineProps({
  seats: Array,
  playerCount: Number,
  layoutId: String,
})

const emit = defineEmits(['setCount', 'setLayout', 'setSeat', 'setRole', 'start', 'back'])

const editingSeat = ref(null)

const selectedCount = computed(() => props.playerCount)
const selectedLayout = computed(() => props.layoutId)

const usedPlayers = computed(() =>
  props.seats.filter(s => s.player).map(s => s.player)
)

const allSeatsReady = computed(() =>
  props.seats.every(s => s.player && s.deck)
)

function handleCountChange(count) {
  emit('setCount', count, defaultLayout(count).id)
}

function handleSeatSelect({ player, deck }) {
  emit('setSeat', editingSeat.value, player, deck)
  editingSeat.value = null
}

const ROLES_5 = ['King', 'Knight', 'Goblin', 'Goblin', 'Lord']
const ROLES_6 = ['King', 'Knight', 'Goblin', 'Goblin', 'Lord', 'Clone Lord']

const availableRoles = computed(() =>
  props.playerCount === 6 ? ROLES_6 : ROLES_5
)

function rolesForSeat(seatIndex) {
  const used = props.seats
    .filter((s, i) => i !== seatIndex && s.role)
    .map(s => s.role)
  const available = [...availableRoles.value]
  for (const r of used) {
    const idx = available.indexOf(r)
    if (idx !== -1) available.splice(idx, 1)
  }
  return [...new Set(available)]
}

const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
  'Clone Lord': '#5ba3d9',
}
</script>

<template>
  <div class="setup-screen">
    <h2 class="font-beleren text-mtg-gold text-xl mb-6">New Game</h2>

    <!-- Player count -->
    <div class="section-label">Players</div>
    <div class="count-btns mb-4">
      <button
        v-for="n in [5, 6]"
        :key="n"
        class="count-btn"
        :class="{ active: selectedCount === n }"
        @click="handleCountChange(n)"
      >
        {{ n }}
      </button>
    </div>

    <!-- Layout -->
    <div class="section-label">Table Layout</div>
    <LayoutPicker
      :player-count="selectedCount"
      :selected="selectedLayout"
      @select="(id) => emit('setLayout', id)"
    />

    <!-- Seats -->
    <div class="section-label mt-5">Seats</div>
    <div class="seat-list">
      <button
        v-for="(seat, i) in seats"
        :key="i"
        class="seat-btn"
        :class="{ filled: seat.player }"
        @click="editingSeat = i"
      >
        <span class="seat-num">{{ i + 1 }}</span>
        <span v-if="seat.player" class="seat-info">
          <span class="seat-player">{{ seat.player }}</span>
          <span v-if="seat.deck" class="seat-deck">{{ seat.deck.name }}</span>
        </span>
        <span v-else class="seat-empty">Tap to assign</span>
        <span
          v-if="seat.role"
          class="seat-role"
          :style="{ color: ROLE_COLORS[seat.role] }"
        >{{ seat.role }}</span>
      </button>
    </div>

    <!-- Roles -->
    <div v-if="allSeatsReady" class="mt-5">
      <div class="section-label">Roles</div>
      <div class="role-grid">
        <div v-for="(seat, i) in seats" :key="i" class="role-row">
          <span class="role-player font-beleren">{{ seat.player }}</span>
          <div class="role-options">
            <button
              v-for="role in rolesForSeat(i)"
              :key="role"
              class="role-btn"
              :class="{ active: seat.role === role }"
              :style="seat.role === role ? { borderColor: ROLE_COLORS[role], color: ROLE_COLORS[role] } : {}"
              @click="emit('setRole', i, role)"
            >{{ role }}</button>
            <button
              v-if="seat.role"
              class="role-btn role-clear"
              @click="emit('setRole', i, null)"
            >&times;</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions mt-6">
      <button
        class="start-btn"
        :disabled="!allSeatsReady"
        @click="emit('start')"
      >
        Start Game
      </button>
      <button class="back-btn" @click="emit('back')">Back to Dashboard</button>
    </div>

    <!-- Deck picker modal -->
    <DeckPicker
      v-if="editingSeat !== null"
      :seat-index="editingSeat"
      :current-player="seats[editingSeat]?.player"
      :current-deck="seats[editingSeat]?.deck"
      :used-players="usedPlayers"
      @select="handleSeatSelect"
      @close="editingSeat = null"
    />
  </div>
</template>

<style scoped>
.setup-screen {
  padding: 24px;
  max-width: 420px;
  margin: 0 auto;
}

.section-label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.count-btns {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.count-btn {
  font-family: 'Cinzel', serif;
  font-size: 1.4rem;
  width: 64px;
  height: 64px;
  border-radius: 3px;
  border: 2px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  cursor: pointer;
  transition: all 0.2s;
}

.count-btn:hover {
  border-color: #8a7e66;
}

.count-btn.active {
  border-color: #c9a54e;
  background: #c9a54e22;
  color: #c9a54e;
}

.seat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.seat-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #1a1612;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.seat-btn:hover {
  border-color: #8a7e66;
}

.seat-btn.filled {
  border-color: #3d352966;
  background: #231f1a;
}

.seat-num {
  font-family: 'Cinzel', serif;
  font-size: 0.9rem;
  color: #8a7e66;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.seat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.seat-player {
  font-family: 'Cinzel', serif;
  font-size: 0.9rem;
  color: #d4c8a8;
}

.seat-deck {
  font-family: 'EB Garamond', serif;
  font-size: 0.8rem;
  color: #8a7e66;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seat-empty {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  color: #8a7e6666;
  font-style: italic;
}

.seat-role {
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  margin-left: auto;
}

.role-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-player {
  font-size: 0.9rem;
  color: #d4c8a8;
  min-width: 80px;
}

.role-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.role-btn {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  padding: 8px 14px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
}

.role-btn:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}

.role-btn.active {
  background: #1a161288;
}

.role-clear {
  color: #8a7e6644;
  font-size: 1rem;
  padding: 8px 10px;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.start-btn {
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  padding: 16px 40px;
  border-radius: 3px;
  border: 2px solid #c9a54e66;
  background: #c9a54e22;
  color: #c9a54e;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:hover:not(:disabled) {
  background: #c9a54e33;
  border-color: #c9a54e;
}

.start-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.back-btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 12px 24px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: none;
  color: #8a7e66;
  cursor: pointer;
}

.back-btn:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
