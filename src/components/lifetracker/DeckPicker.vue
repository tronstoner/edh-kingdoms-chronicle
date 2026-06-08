<script setup>
import { ref, computed, inject } from 'vue'
import { colorIcons } from '../../mana.js'

const LS_GUESTS = 'edhlog-lt-session-guests'

const props = defineProps({
  seatIndex: Number,
  currentPlayer: String,
  currentDeck: Object,
  usedPlayers: Array,
  rotated: Boolean,
})

const emit = defineEmits(['select', 'close'])

const data = inject('data')

// Load session guests from localStorage
function loadGuests() {
  try {
    return JSON.parse(localStorage.getItem(LS_GUESTS) || '[]')
  } catch { return [] }
}

function saveGuests(guests) {
  localStorage.setItem(LS_GUESTS, JSON.stringify(guests))
}

const sessionGuests = ref(loadGuests())

const registeredPlayers = computed(() => {
  if (!data.value?.players) return []
  return data.value.players.map(p => p.name)
})

const allPlayers = computed(() => {
  const names = [...registeredPlayers.value]
  for (const g of sessionGuests.value) {
    if (!names.includes(g.name)) names.push(g.name)
  }
  return names
})

const selectedPlayer = ref(props.currentPlayer || null)
const showAddGuest = ref(false)
const guestName = ref('')
const showTempDeck = ref(false)
const tempName = ref('')
const tempColors = ref({ W: false, U: false, B: false, R: false, G: false, C: false })

const decks = computed(() => {
  if (!selectedPlayer.value) return []
  // Registered decks
  const registered = data.value?.decks?.filter(d => d.owner === selectedPlayer.value) || []
  // Session guest decks
  const guest = sessionGuests.value.find(g => g.name === selectedPlayer.value)
  const guestDecks = guest?.decks || []
  return [...registered, ...guestDecks]
})

function selectPlayer(name) {
  selectedPlayer.value = name
  showTempDeck.value = false
  showAddGuest.value = false
}

function addGuest() {
  const name = guestName.value.trim()
  if (!name) return
  if (!sessionGuests.value.find(g => g.name === name)) {
    sessionGuests.value.push({ name, decks: [] })
    saveGuests(sessionGuests.value)
  }
  selectedPlayer.value = name
  guestName.value = ''
  showAddGuest.value = false
}

function selectDeck(deck) {
  emit('select', {
    player: selectedPlayer.value,
    deck: { name: deck.name, colors: deck.colors, isTemp: !!deck.isTemp },
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
  const deck = { name: tempName.value || 'Unknown Deck', colors, isTemp: true }
  // Save to session guest's deck list
  const guest = sessionGuests.value.find(g => g.name === selectedPlayer.value)
  if (guest) {
    if (!guest.decks.find(d => d.name === deck.name)) {
      guest.decks.push(deck)
      saveGuests(sessionGuests.value)
    }
  } else if (!registeredPlayers.value.includes(selectedPlayer.value)) {
    // Auto-create guest entry
    sessionGuests.value.push({ name: selectedPlayer.value, decks: [deck] })
    saveGuests(sessionGuests.value)
  }
  emit('select', { player: selectedPlayer.value, deck })
}

function isUsed(name) {
  return props.usedPlayers.includes(name) && name !== props.currentPlayer
}

function isGuest(name) {
  return !registeredPlayers.value.includes(name)
}

function dismissAndSave() {
  if (selectedPlayer.value && selectedPlayer.value !== props.currentPlayer) {
    emit('select', { player: selectedPlayer.value, deck: props.currentDeck || null })
  } else {
    emit('close')
  }
}
</script>

<template>
  <div class="deck-picker" @click.self="dismissAndSave">
    <div class="picker-content" :style="{ transform: rotated ? 'rotate(180deg)' : undefined }">
      <button class="lt-modal-close" @click="emit('close')" aria-label="Close">×</button>
      <h3 class="font-beleren text-mtg-gold mb-4">Seat {{ seatIndex + 1 }}</h3>

      <!-- Player selection -->
      <div class="section-label">Player</div>
      <div class="player-grid">
        <button
          v-for="name in allPlayers"
          :key="name"
          class="player-btn"
          :class="{ active: selectedPlayer === name, used: isUsed(name), guest: isGuest(name) }"
          :disabled="isUsed(name)"
          @click="selectPlayer(name)"
        >
          {{ name }}
        </button>
        <button class="player-btn player-btn-add" @click="showAddGuest = !showAddGuest">
          {{ showAddGuest ? '✕' : '+ Guest' }}
        </button>
      </div>

      <!-- Add guest -->
      <div v-if="showAddGuest" class="add-guest mt-3">
        <input
          v-model="guestName"
          placeholder="Guest name"
          class="guest-input"
          @keyup.enter="addGuest"
        />
        <button class="guest-add-btn" @click="addGuest">Add</button>
      </div>

      <!-- Player-only confirm -->
      <button
        v-if="selectedPlayer && selectedPlayer !== currentPlayer"
        class="player-confirm-btn mt-3"
        @click="emit('select', { player: selectedPlayer, deck: currentDeck || null })"
      >Seat {{ selectedPlayer }} without deck</button>

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
            {{ showTempDeck ? 'Cancel' : '+ New Deck' }}
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
  background: color-mix(in srgb, var(--lt-bg) 93%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.picker-content {
  position: relative;
  background: var(--lt-panel-bg);
  border: 2px solid var(--lt-border);
  border-radius: 3px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.section-label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  color: var(--lt-text-dim);
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
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-bg);
  color: var(--lt-text);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.player-btn:hover:not(:disabled) {
  border-color: var(--lt-text-dim);
}

.player-btn.active {
  border-color: var(--lt-gold);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
  color: var(--lt-gold);
}

.player-btn.used {
  opacity: 0.3;
  cursor: not-allowed;
}

.player-btn.guest {
  border-style: dashed;
}

.player-btn-add {
  color: var(--lt-text-dim);
  border-style: dashed;
}

.add-guest {
  display: flex;
  gap: 8px;
}

.guest-input {
  font-family: 'EB Garamond', serif;
  font-size: 1.1rem;
  padding: 10px 14px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-bg);
  color: var(--lt-text);
  outline: none;
  flex: 1;
}

.guest-input:focus {
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
}

.guest-add-btn {
  font-family: 'Cinzel', serif;
  font-size: 0.9rem;
  padding: 10px 18px;
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--lt-gold) 40%, transparent);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
  color: var(--lt-gold);
  cursor: pointer;
}

.player-confirm-btn {
  font-family: 'EB Garamond', serif;
  font-size: 0.95rem;
  font-style: italic;
  padding: 10px 16px;
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--lt-border) 40%, transparent);
  background: none;
  color: var(--lt-text-dim);
  cursor: pointer;
  display: block;
  width: 100%;
  text-align: center;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.player-confirm-btn:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
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
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-bg);
  color: var(--lt-text);
  font-family: 'EB Garamond', serif;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  text-align: left;
}

.deck-btn:hover {
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
  background: color-mix(in srgb, var(--lt-gold) 7%, transparent);
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
  color: var(--lt-text-dim);
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
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-bg);
  color: var(--lt-text);
  outline: none;
}

.temp-input:focus {
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
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
  border: 2px solid var(--lt-border);
  background: var(--lt-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.color-toggle.active {
  border-color: var(--lt-gold);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
}

.confirm-btn {
  font-family: 'Cinzel', serif;
  padding: 14px 24px;
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--lt-gold) 40%, transparent);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
  color: var(--lt-gold);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.confirm-btn:hover {
  background: color-mix(in srgb, var(--lt-gold) 20%, transparent);
  border-color: var(--lt-gold);
}

.close-btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 12px 24px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: none;
  color: var(--lt-text-dim);
  cursor: pointer;
  display: block;
  margin: 0 auto;
}

.close-btn:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}
</style>
