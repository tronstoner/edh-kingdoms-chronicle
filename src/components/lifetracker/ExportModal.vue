<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  games: Array,
})

const emit = defineEmits(['close', 'clearGames'])

const ROLES = ['', 'King', 'Knight', 'Goblin', 'Lord', 'Clone Lord']
const ROLE_NOTES = ['', 'Zombie', 'Clone', 'Suicide']

const copied = ref(false)
const confirmClear = ref(false)

// Editable state per game
const gameData = ref(props.games.map(g => {
  const now = new Date(g.startTime || Date.now())
  const autoFirstKO = (() => {
    const deaths = g.seats.filter(s => s.deathTurn !== null).sort((a, b) => a.deathTurn - b.deathTurn)
    return deaths.length > 0 ? String(deaths[0].deathTurn) : ''
  })()
  return {
    selected: true,
    date: `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`,
    firstKO: g.concludeData?.firstKO || autoFirstKO,
    gameEnd: g.concludeData?.gameEnd || String(g.turnCount || ''),
    gameNotes: '',
    seats: g.seats.map(s => ({
      player: s.player || '',
      deck: s.deck?.name || '',
      role: s.role || '',
      result: s.isWinner ? 'Win' : 'Loss',
      roleNotes: s.roleNotes || '',
    })),
  }
}))

function toggleResult(gi, si) {
  gameData.value[gi].seats[si].result = gameData.value[gi].seats[si].result === 'Win' ? 'Loss' : 'Win'
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

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(exportText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = exportText.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<template>
  <div class="export-overlay" @click.self="emit('close')">
    <div class="export-panel">
      <h3 class="font-beleren text-mtg-gold mb-4">Export Session ({{ games.length }} games)</h3>

      <div v-if="!games.length" class="no-games">
        <p class="font-body text-mtg-text-dim">No saved games yet. Save a game first.</p>
      </div>

      <div v-else class="games-list">
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

      <!-- Preview -->
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

      <!-- Actions -->
      <div class="export-actions">
        <button v-if="games.length" class="export-btn export-btn-copy" @click="copyToClipboard">
          {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
        </button>
        <button v-if="games.length && !confirmClear" class="export-btn export-btn-clear" @click="confirmClear = true">Clear All Games</button>
        <button v-if="confirmClear" class="export-btn export-btn-clear-confirm" @click="emit('clearGames')">Yes, clear all {{ games.length }} games</button>
        <button v-if="confirmClear" class="export-btn export-btn-cancel" @click="confirmClear = false">No</button>
        <button class="export-btn export-btn-cancel" @click="emit('close')">Close</button>
      </div>
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

.export-btn-clear-confirm {
  color: #d95555;
  border-color: #d95555;
  background: #d9555522;
}

.export-btn-clear-confirm:hover {
  background: #d9555533;
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
