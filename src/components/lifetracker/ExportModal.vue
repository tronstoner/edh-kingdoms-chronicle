<script setup>
import { ref, computed } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { HOUSE_TO_ID, turnPositionFor } from '../../lifetracker/cycle.js'

const props = defineProps({
  games: Array,
  cycleGames: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'clearGames', 'clearCycleGames'])

const ROLES = ['', 'King', 'Knight', 'Goblin', 'Lord', 'Clone Lord']
const ROLE_NOTES = ['', 'Zombie', 'Clone', 'Suicide']

const copied = ref(false)
const copiedCycle = ref(false)
const showConfirmClear = ref(false)
const showConfirmClearCycle = ref(false)

function formatDate(ts) {
  const d = new Date(ts || Date.now())
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function autoFirstKO(g) {
  const deaths = g.seats.filter(s => s.deathTurn !== null).sort((a, b) => a.deathTurn - b.deathTurn)
  return deaths.length > 0 ? String(deaths[0].deathTurn) : ''
}

// Editable state per Kingdoms game
const gameData = ref(props.games.map(g => ({
  selected: true,
  date: formatDate(g.startTime),
  firstKO: g.concludeData?.firstKO || autoFirstKO(g),
  gameEnd: g.concludeData?.gameEnd || String(g.turnCount || ''),
  gameNotes: '',
  seats: g.seats.map(s => ({
    player: s.player || '',
    deck: s.deck?.name || '',
    role: s.role || '',
    result: s.isWinner ? 'Win' : 'Loss',
    roleNotes: s.roleNotes || '',
  })),
})))

// Editable state per Cycle game
const cycleGameData = ref(props.cycleGames.map(g => ({
  selected: true,
  date: formatDate(g.startTime),
  firstKO: g.concludeData?.firstKO || autoFirstKO(g),
  gameEnd: g.concludeData?.gameEnd || String(g.turnCount || ''),
  gameNotes: '',
  startingSeatIndex: g.startingSeatIndex,
  seatCount: g.seats.length,
  seats: g.seats.map((s, i) => ({
    seat: `P${i + 1}`,
    player: s.player || '',
    deck: s.deck?.name || '',
    colors: s.deck?.colors || '',
    house: s.house || '',
    houseId: HOUSE_TO_ID[s.house] || '',
    turnOrder: g.startingSeatIndex != null ? String(turnPositionFor(i, g.startingSeatIndex, g.seats.length)) : '',
    result: s.isWinner ? 'Win' : 'Loss',
    koTurn: s.deathTurn != null ? String(s.deathTurn) : '',
    notes: s.roleNotes || '',
  })),
})))

function toggleResult(gi, si) {
  gameData.value[gi].seats[si].result = gameData.value[gi].seats[si].result === 'Win' ? 'Loss' : 'Win'
}

function toggleCycleResult(gi, si) {
  cycleGameData.value[gi].seats[si].result = cycleGameData.value[gi].seats[si].result === 'Win' ? 'Loss' : 'Win'
}

const exportText = computed(() => {
  return gameData.value
    .filter(g => g.selected)
    .map(g => {
      return g.seats.map((s, i) => {
        const d = i === 0 ? g.date : ''
        const fko = i === 0 ? g.firstKO : ''
        const gEnd = i === 0 ? g.gameEnd : ''
        const gNotes = i === 0 ? g.gameNotes : ''
        return [d, s.player, s.deck, s.role, s.result, s.roleNotes, fko, gEnd, gNotes].join('\t')
      }).join('\n')
    })
    .join('\n')
})

// Cycle TSV: Date | Seat | Player | Deck | Colors | House | Turn Order | Result | KO Turn | Notes
const cycleExportText = computed(() => {
  return cycleGameData.value
    .filter(g => g.selected)
    .map(g => {
      return g.seats.map((s, i) => {
        const d = i === 0 ? g.date : ''
        const fko = i === 0 ? g.firstKO : ''
        const gEnd = i === 0 ? g.gameEnd : ''
        const gNotes = i === 0 ? g.gameNotes : ''
        return [d, s.seat, s.player, s.deck, s.colors, s.houseId, s.turnOrder, s.result, s.koTurn, s.notes, fko, gEnd, gNotes].join('\t')
      }).join('\n')
    })
    .join('\n')
})

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  flag.value = true
  setTimeout(() => { flag.value = false }, 2000)
}

function copyToClipboard() { copyText(exportText.value, copied) }
function copyCycleToClipboard() { copyText(cycleExportText.value, copiedCycle) }
</script>

<template>
  <div class="export-overlay" @click.self="emit('close')">
    <div class="export-panel">
      <h3 class="font-beleren text-mtg-gold mb-4">Export Session ({{ games.length + cycleGames.length }} games)</h3>

      <div v-if="!games.length && !cycleGames.length" class="no-games">
        <p class="font-body text-mtg-text-dim">No saved games yet. Save a game first.</p>
      </div>

      <!-- Kingdoms section -->
      <div v-if="games.length" class="section-header">
        <h4 class="section-title font-beleren">Kingdoms ({{ games.length }})</h4>
      </div>

      <div v-if="games.length" class="games-list">
        <div v-for="(g, gi) in gameData" :key="gi" class="game-block" :class="{ deselected: !g.selected }">
          <!-- Game header -->
          <div class="game-header">
            <label class="game-check">
              <input type="checkbox" v-model="g.selected" />
              <span class="font-beleren">Game {{ gi + 1 }}</span>
            </label>
            <div class="game-fields">
              <label class="game-field"><span class="field-label">Date</span><input v-model="g.date" class="field-input field-input-date" /></label>
              <label class="game-field"><span class="field-label">1st KO</span><input v-model="g.firstKO" class="field-input field-input-narrow" /></label>
              <label class="game-field"><span class="field-label">End</span><input v-model="g.gameEnd" class="field-input field-input-narrow" /></label>
              <label class="game-field"><span class="field-label">Notes</span><input v-model="g.gameNotes" class="field-input" /></label>
            </div>
          </div>

          <!-- Player rows -->
          <div class="game-rows">
            <div v-for="(s, si) in g.seats" :key="si" class="export-row">
              <span class="export-player font-beleren">{{ s.player }}</span>
              <span class="export-deck">{{ s.deck }}</span>
              <select v-model="s.role" class="export-select">
                <option v-for="r in ROLES" :key="r" :value="r">{{ r || '—' }}</option>
              </select>
              <button
                class="export-result"
                :class="s.result === 'Win' ? 'result-win' : 'result-loss'"
                @click="toggleResult(gi, si)"
              >{{ s.result }}</button>
              <select v-model="s.roleNotes" class="export-select">
                <option v-for="rn in ROLE_NOTES" :key="rn" :value="rn">{{ rn || '—' }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Kingdoms preview -->
      <div v-if="games.length" class="export-preview">
        <table class="preview-table">
          <thead>
            <tr>
              <th>Date</th><th>Player</th><th>Deck</th><th>Role</th><th>Result</th><th>Role Notes</th><th>1st KO</th><th>End</th><th>Game Notes</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(g, gi) in gameData" :key="gi">
              <template v-if="g.selected">
                <tr v-for="(s, si) in g.seats" :key="`${gi}-${si}`">
                  <td>{{ si === 0 ? g.date : '' }}</td>
                  <td>{{ s.player }}</td>
                  <td>{{ s.deck }}</td>
                  <td>{{ s.role }}</td>
                  <td>{{ s.result }}</td>
                  <td>{{ s.roleNotes }}</td>
                  <td>{{ si === 0 ? g.firstKO : '' }}</td>
                  <td>{{ si === 0 ? g.gameEnd : '' }}</td>
                  <td>{{ si === 0 ? g.gameNotes : '' }}</td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Kingdoms actions -->
      <div v-if="games.length" class="export-actions">
        <button class="export-btn export-btn-copy" @click="copyToClipboard">
          {{ copied ? 'Copied!' : 'Copy Kingdoms TSV' }}
        </button>
        <button class="export-btn export-btn-clear" @click="showConfirmClear = true">Clear Kingdoms Games</button>
      </div>

      <!-- Cycle section -->
      <div v-if="cycleGames.length" class="section-header">
        <h4 class="section-title font-beleren">The Cycle ({{ cycleGames.length }})</h4>
      </div>

      <div v-if="cycleGames.length" class="games-list">
        <div v-for="(g, gi) in cycleGameData" :key="`c-${gi}`" class="game-block" :class="{ deselected: !g.selected }">
          <div class="game-header">
            <label class="game-check">
              <input type="checkbox" v-model="g.selected" />
              <span class="font-beleren">Cycle Game {{ gi + 1 }}</span>
            </label>
            <div class="game-fields">
              <label class="game-field"><span class="field-label">Date</span><input v-model="g.date" class="field-input field-input-date" /></label>
              <label class="game-field"><span class="field-label">1st KO</span><input v-model="g.firstKO" class="field-input field-input-narrow" /></label>
              <label class="game-field"><span class="field-label">End</span><input v-model="g.gameEnd" class="field-input field-input-narrow" /></label>
              <label class="game-field"><span class="field-label">Notes</span><input v-model="g.gameNotes" class="field-input" /></label>
            </div>
          </div>
          <div class="game-rows">
            <div v-for="(s, si) in g.seats" :key="si" class="export-row">
              <span class="export-player font-beleren">{{ s.seat }} · {{ s.player }}</span>
              <span class="export-deck">{{ s.deck }}</span>
              <span class="export-house">House {{ s.houseId }} ({{ s.house }})</span>
              <span class="export-turn">Turn {{ s.turnOrder }}</span>
              <button
                class="export-result"
                :class="s.result === 'Win' ? 'result-win' : 'result-loss'"
                @click="toggleCycleResult(gi, si)"
              >{{ s.result }}</button>
              <input v-model="s.koTurn" class="field-input field-input-narrow" placeholder="KO turn" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="cycleGames.length" class="export-preview">
        <table class="preview-table">
          <thead>
            <tr>
              <th>Date</th><th>Seat</th><th>Player</th><th>Deck</th><th>Colors</th><th>House</th><th>Turn</th><th>Result</th><th>KO</th><th>Notes</th><th>1st KO</th><th>End</th><th>Game Notes</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(g, gi) in cycleGameData" :key="`cp-${gi}`">
              <template v-if="g.selected">
                <tr v-for="(s, si) in g.seats" :key="`${gi}-${si}`">
                  <td>{{ si === 0 ? g.date : '' }}</td>
                  <td>{{ s.seat }}</td>
                  <td>{{ s.player }}</td>
                  <td>{{ s.deck }}</td>
                  <td>{{ s.colors }}</td>
                  <td>{{ s.houseId }}</td>
                  <td>{{ s.turnOrder }}</td>
                  <td>{{ s.result }}</td>
                  <td>{{ s.koTurn }}</td>
                  <td>{{ s.notes }}</td>
                  <td>{{ si === 0 ? g.firstKO : '' }}</td>
                  <td>{{ si === 0 ? g.gameEnd : '' }}</td>
                  <td>{{ si === 0 ? g.gameNotes : '' }}</td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="cycleGames.length" class="export-actions">
        <button class="export-btn export-btn-copy" @click="copyCycleToClipboard">
          {{ copiedCycle ? 'Copied!' : 'Copy Cycle TSV' }}
        </button>
        <button class="export-btn export-btn-clear" @click="showConfirmClearCycle = true">Clear Cycle Games</button>
      </div>

      <!-- Close -->
      <div class="export-actions">
        <button class="export-btn export-btn-cancel" @click="emit('close')">Close</button>
      </div>

      <ConfirmDialog
        v-if="showConfirmClear"
        title="Clear Kingdoms Games"
        :message="`This will permanently delete all ${games.length} saved Kingdoms games. Are you sure?`"
        confirm-label="Delete All"
        :danger="true"
        @confirm="emit('clearGames'); showConfirmClear = false"
        @cancel="showConfirmClear = false"
      />
      <ConfirmDialog
        v-if="showConfirmClearCycle"
        title="Clear Cycle Games"
        :message="`This will permanently delete all ${cycleGames.length} saved Cycle games. Are you sure?`"
        confirm-label="Delete All"
        :danger="true"
        @confirm="emit('clearCycleGames'); showConfirmClearCycle = false"
        @cancel="showConfirmClearCycle = false"
      />
    </div>
  </div>
</template>

<style scoped>
.export-overlay {
  position: fixed;
  inset: 0;
  background: #1a1612ee;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.export-panel {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 3px;
  padding: 24px;
  width: 98vw;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
}

.no-games {
  text-align: center;
  padding: 24px;
}

.section-header {
  margin: 8px 0 10px;
  border-bottom: 1px solid #3d3529;
  padding-bottom: 6px;
}

.section-title {
  color: #c9a54e;
  font-size: 1.05rem;
  margin: 0;
  letter-spacing: 0.05em;
}

.export-house {
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  color: #c9a54e;
  letter-spacing: 0.04em;
}

.export-turn {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  color: #8a7e66;
  letter-spacing: 0.04em;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.game-block {
  border: 1px solid #3d3529;
  border-radius: 3px;
  padding: 12px;
  background: #1a1612;
}

.game-block.deselected {
  opacity: 0.4;
}

.game-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.game-check {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #c9a54e;
  cursor: pointer;
  font-size: 0.95rem;
}

.game-check input {
  accent-color: #c9a54e;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.game-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.game-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-label {
  font-family: 'Cinzel', serif;
  font-size: 0.65rem;
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-input {
  font-family: 'EB Garamond', serif;
  font-size: 0.9rem;
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  outline: none;
  width: 100px;
}

.field-input:focus {
  border-color: #c9a54e66;
}

.field-input-date {
  width: 90px;
}

.field-input-narrow {
  width: 50px;
  text-align: center;
}

.game-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.export-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 8px;
  background: #231f1a;
  border: 1px solid #3d352944;
  border-radius: 3px;
}

.export-player {
  font-size: 0.9rem;
  color: #d4c8a8;
  min-width: 65px;
}

.export-deck {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  color: #8a7e66;
  font-style: italic;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.export-select {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  outline: none;
  cursor: pointer;
}

.export-select:focus {
  border-color: #c9a54e66;
}

.export-result {
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  padding: 4px 0;
  width: 50px;
  text-align: center;
  border-radius: 3px;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
}

.result-win {
  color: #c9a54e;
  border-color: #c9a54e66;
  background: #c9a54e11;
}

.result-loss {
  color: #8a7e66;
  border-color: #3d3529;
  background: none;
}

.export-preview {
  background: #1a1612;
  border: 1px solid #3d3529;
  border-radius: 3px;
  padding: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'EB Garamond', serif;
  font-size: 0.75rem;
  color: #8a7e66;
}

.preview-table th {
  font-family: 'Cinzel', serif;
  font-size: 0.6rem;
  color: #8a7e6688;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: left;
  padding: 2px 6px;
  border-bottom: 1px solid #3d352966;
  white-space: nowrap;
}

.preview-table td {
  padding: 2px 6px;
  white-space: nowrap;
}

.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.export-btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 12px 28px;
  border-radius: 3px;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn-copy {
  color: #c9a54e;
  border-color: #c9a54e66;
  background: #c9a54e22;
}

.export-btn-copy:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
}

.export-btn-clear {
  color: #d95555;
  border-color: #d9555544;
  background: none;
}

.export-btn-clear:hover {
  border-color: #d95555;
}

.export-btn-cancel {
  color: #8a7e66;
  border-color: #3d352966;
  background: none;
  font-size: 0.9rem;
}

.export-btn-cancel:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
