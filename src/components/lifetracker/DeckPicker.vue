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

const emit = defineEmits(['select', 'clear', 'close'])

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

// Borrowing: when set, the deck list is sourced from another player while the
// seat still goes to selectedPlayer. null = the seated player's own decks.
const borrowFrom = ref(null)
const showBorrow = ref(false)

// Most-recent play index per "player|deck". data.value.games is chronological
// (oldest first), so the highest index a pair appears at is its latest play.
const lastPlayedRank = computed(() => {
  const map = new Map()
  const games = data.value?.games || []
  games.forEach((g, i) => {
    for (const p of g.players) {
      if (p.deck) map.set(`${p.player}|${p.deck}`, i)
    }
  })
  return map
})

// Whose decks the list currently shows (borrow target or the seated player).
const deckOwner = computed(() => borrowFrom.value || selectedPlayer.value)

const decks = computed(() => {
  const owner = deckOwner.value
  if (!owner) return []
  const registered = data.value?.decks?.filter(d => d.owner === owner) || []
  const guest = sessionGuests.value.find(g => g.name === owner)
  const guestDecks = guest?.decks || []
  const all = [...registered, ...guestDecks]
  const rank = lastPlayedRank.value
  const gameCount = (data.value?.games || []).length
  // Most-recently-played first; session temp decks rank above history (they're
  // fresh this session); never-played decks fall to the bottom in sheet order.
  return all
    .map((d, idx) => ({
      deck: d,
      idx,
      rank: d.isTemp ? gameCount + idx + 1 : (rank.get(`${owner}|${d.name}`) ?? -1),
    }))
    .sort((a, b) => b.rank - a.rank || a.idx - b.idx)
    .map(x => x.deck)
})

// Players you can borrow a deck from (everyone but the seated player).
const borrowablePlayers = computed(() =>
  allPlayers.value.filter(n => n !== selectedPlayer.value))

function selectPlayer(name) {
  // Player already seated elsewhere → fast one-tap swap. Emit without a deck
  // so the handler carries their current deck and trades the two seats.
  if (isUsed(name)) {
    emit('select', { player: name })
    return
  }
  selectedPlayer.value = name
  showTempDeck.value = false
  showAddGuest.value = false
  borrowFrom.value = null
  showBorrow.value = false
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

function clearSeat() {
  selectedPlayer.value = null
  emit('clear')
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
          :class="{ active: selectedPlayer === name, seated: isUsed(name), guest: isGuest(name) }"
          :title="isUsed(name) ? 'Seated elsewhere — tap to swap' : undefined"
          @click="selectPlayer(name)"
        >
          {{ name }}<span v-if="isUsed(name)" class="seated-mark">⇄</span>
        </button>
        <button class="player-btn player-btn-add" @click="showAddGuest = !showAddGuest">
          {{ showAddGuest ? '✕' : '+ Guest' }}
        </button>
        <button v-if="currentPlayer" class="player-btn player-btn-clear" @click="clearSeat">Clear</button>
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
        <div class="deck-head mt-4">
          <div class="section-label section-label-inline">
            Deck
            <span v-if="borrowFrom" class="borrow-tag">borrowed from {{ borrowFrom }}</span>
          </div>
          <button
            v-if="borrowablePlayers.length"
            class="borrow-toggle"
            :class="{ active: showBorrow || borrowFrom }"
            @click="showBorrow = !showBorrow"
          >{{ showBorrow ? 'Close' : '⇄ Borrow' }}</button>
        </div>

        <!-- Borrow: pick whose decks to show -->
        <div v-if="showBorrow" class="borrow-panel">
          <button
            class="borrow-chip"
            :class="{ active: !borrowFrom }"
            @click="borrowFrom = null"
          >{{ selectedPlayer }} · own</button>
          <button
            v-for="name in borrowablePlayers"
            :key="name"
            class="borrow-chip"
            :class="{ active: borrowFrom === name }"
            @click="borrowFrom = name"
          >{{ name }}</button>
        </div>

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

          <div v-if="!decks.length" class="deck-empty">
            {{ borrowFrom ? `${borrowFrom} has no decks` : 'No decks yet — add one below' }}
          </div>

          <!-- Temp deck toggle (own decks only) -->
          <button v-if="!borrowFrom" class="deck-btn deck-btn-temp" @click="showTempDeck = !showTempDeck">
            {{ showTempDeck ? 'Cancel' : '+ New Deck' }}
          </button>
        </div>

        <!-- Temp deck form -->
        <div v-if="showTempDeck && !borrowFrom" class="temp-form mt-3">
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
  padding: 28px 32px;
  width: 92%;
  max-width: clamp(460px, 72vw, 900px);
  max-height: 88vh;
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

.player-btn.seated {
  border-style: dashed;
  color: var(--lt-text-dim);
}

.player-btn.seated:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
  color: var(--lt-text);
}

.seated-mark {
  margin-left: 6px;
  font-size: 0.85em;
  opacity: 0.7;
}

.player-btn.guest {
  border-style: dashed;
}

.player-btn-add {
  color: var(--lt-text-dim);
  border-style: dashed;
}

.player-btn-clear {
  color: color-mix(in srgb, #d95555 70%, transparent);
  border-color: color-mix(in srgb, #d95555 30%, transparent);
  border-style: dashed;
}

.player-btn-clear:hover {
  color: #d95555;
  border-color: #d95555;
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

.deck-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.section-label-inline {
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.borrow-tag {
  font-family: 'EB Garamond', serif;
  font-style: italic;
  font-size: 0.8rem;
  text-transform: none;
  letter-spacing: 0;
  color: var(--lt-gold);
}

.borrow-toggle {
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  padding: 7px 14px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  border-style: dashed;
  background: none;
  color: var(--lt-text-dim);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.borrow-toggle:hover,
.borrow-toggle.active {
  border-style: solid;
  border-color: color-mix(in srgb, var(--lt-gold) 45%, transparent);
  color: var(--lt-gold);
}

.borrow-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--lt-border);
  border-radius: 3px;
  background: color-mix(in srgb, var(--lt-bg) 60%, transparent);
}

.borrow-chip {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  padding: 8px 14px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-bg);
  color: var(--lt-text);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.borrow-chip:hover {
  border-color: var(--lt-text-dim);
}

.borrow-chip.active {
  border-color: var(--lt-gold);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
  color: var(--lt-gold);
}

.deck-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}

.deck-empty {
  grid-column: 1 / -1;
  font-family: 'EB Garamond', serif;
  font-style: italic;
  font-size: 0.95rem;
  color: var(--lt-text-dim);
  padding: 8px 2px;
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
  grid-column: 1 / -1;
  justify-content: center;
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

</style>
