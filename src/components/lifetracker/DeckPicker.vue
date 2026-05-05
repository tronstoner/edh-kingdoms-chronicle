<script setup>
import { ref, computed, inject } from 'vue'
import { colorIcons } from '../../mana.js'

const props = defineProps({
  seatIndex: Number,
  currentPlayer: String,
  currentDeck: Object,
  usedPlayers: Array,
})

const emit = defineEmits(['select', 'close'])

const data = inject('data')

const players = computed(() => {
  if (!data.value?.players) return []
  return data.value.players.map(p => p.name)
})

const selectedPlayer = ref(props.currentPlayer || null)
const showTempDeck = ref(false)
const tempName = ref('')
const tempColors = ref({ W: false, U: false, B: false, R: false, G: false, C: false })

const decks = computed(() => {
  if (!data.value?.decks || !selectedPlayer.value) return []
  return data.value.decks.filter(d => d.owner === selectedPlayer.value)
})

function selectPlayer(name) {
  selectedPlayer.value = name
  showTempDeck.value = false
}

function selectDeck(deck) {
  emit('select', {
    player: selectedPlayer.value,
    deck: { name: deck.name, colors: deck.colors, isTemp: false },
  })
}

function toggleColor(c) {
  tempColors.value[c] = !tempColors.value[c]
}

function confirmTempDeck() {
  const colors = Object.entries(tempColors.value)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join('')
  emit('select', {
    player: selectedPlayer.value,
    deck: { name: tempName.value || 'Unknown Deck', colors, isTemp: true },
  })
}

function isUsed(name) {
  return props.usedPlayers.includes(name) && name !== props.currentPlayer
}
</script>

<template>
  <div class="deck-picker" @click.self="emit('close')">
    <div class="picker-content">
      <h3 class="font-beleren text-mtg-gold mb-4">Seat {{ seatIndex + 1 }}</h3>

      <!-- Player selection -->
      <div class="section-label">Player</div>
      <div class="player-grid">
        <button
          v-for="name in players"
          :key="name"
          class="player-btn"
          :class="{ active: selectedPlayer === name, used: isUsed(name) }"
          :disabled="isUsed(name)"
          @click="selectPlayer(name)"
        >
          {{ name }}
        </button>
      </div>

      <!-- Deck selection -->
      <template v-if="selectedPlayer">
        <div class="section-label mt-4">Deck</div>
        <div class="deck-list">
          <button
            v-for="d in decks"
            :key="d.name"
            class="deck-btn"
            @click="selectDeck(d)"
          >
            <span class="deck-btn-name">{{ d.name }}</span>
            <span v-if="d.colors" class="deck-btn-mana">
              <i v-for="c in colorIcons(d.colors)" :key="c.label" :class="[c.icon, 'ms-cost']" class="text-sm"></i>
            </span>
          </button>

          <!-- Temp deck toggle -->
          <button class="deck-btn deck-btn-temp" @click="showTempDeck = !showTempDeck">
            {{ showTempDeck ? 'Cancel' : '+ Temporary Deck' }}
          </button>
        </div>

        <!-- Temp deck form -->
        <div v-if="showTempDeck" class="temp-form mt-3">
          <input
            v-model="tempName"
            placeholder="Deck name"
            class="temp-input"
          />
          <div class="color-toggles">
            <button
              v-for="(icon, c) in { W: 'ms ms-w', U: 'ms ms-u', B: 'ms ms-b', R: 'ms ms-r', G: 'ms ms-g', C: 'ms ms-c' }"
              :key="c"
              class="color-toggle"
              :class="{ active: tempColors[c] }"
              @click="toggleColor(c)"
            >
              <i :class="[icon, 'ms-cost']"></i>
            </button>
          </div>
          <button class="confirm-btn" @click="confirmTempDeck">Confirm</button>
        </div>
      </template>

      <button class="close-btn mt-4" @click="emit('close')">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.deck-picker {
  position: fixed;
  inset: 0;
  background: #1a1612ee;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.picker-content {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.section-label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.player-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.player-btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 12px 18px;
  border-radius: 8px;
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #d4c8a8;
  cursor: pointer;
  transition: all 0.2s;
}

.player-btn:hover:not(:disabled) {
  border-color: #8a7e66;
}

.player-btn.active {
  border-color: #c9a54e;
  background: #c9a54e22;
  color: #c9a54e;
}

.player-btn.used {
  opacity: 0.3;
  cursor: not-allowed;
}

.deck-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deck-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #d4c8a8;
  font-family: 'EB Garamond', serif;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.deck-btn:hover {
  border-color: #c9a54e66;
  background: #c9a54e11;
}

.deck-btn-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deck-btn-mana {
  display: flex;
  gap: 2px;
  margin-left: 8px;
  flex-shrink: 0;
}

.deck-btn-temp {
  color: #8a7e66;
  font-style: italic;
  border-style: dashed;
}

.temp-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.temp-input {
  font-family: 'EB Garamond', serif;
  font-size: 1.1rem;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #d4c8a8;
  outline: none;
}

.temp-input:focus {
  border-color: #c9a54e66;
}

.color-toggles {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.color-toggle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #3d3529;
  background: #1a1612;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.color-toggle.active {
  border-color: #c9a54e;
  background: #c9a54e22;
}

.confirm-btn {
  font-family: 'Cinzel', serif;
  padding: 14px 24px;
  border-radius: 6px;
  border: 1px solid #c9a54e66;
  background: #c9a54e22;
  color: #c9a54e;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
}

.close-btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 12px 24px;
  border-radius: 6px;
  border: 1px solid #3d3529;
  background: none;
  color: #8a7e66;
  cursor: pointer;
  display: block;
  margin: 0 auto;
}

.close-btn:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
