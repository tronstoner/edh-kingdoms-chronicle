<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  seats: Array,
  turnCount: Number,
})

const emit = defineEmits(['close', 'finish'])

const now = new Date()
const date = ref(`${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`)
const autoFirstKO = (() => {
  const deaths = props.seats
    .filter(s => s.deathTurn !== null)
    .sort((a, b) => a.deathTurn - b.deathTurn)
  return deaths.length > 0 ? String(deaths[0].deathTurn) : ''
})()

const firstKO = ref(autoFirstKO)
const gameEnd = ref(String(props.turnCount || ''))
const gameNotes = ref('')
const copied = ref(false)

// Editable overrides per seat
const overrides = ref(props.seats.map(s => ({
  result: s.isWinner ? 'Win' : 'Loss',
  roleNotes: s.roleNotes || '',
})))

const exportText = computed(() => {
  const lines = props.seats.map((s, i) => {
    const d = i === 0 ? date.value : ''
    const player = s.player || ''
    const deck = s.deck?.name || ''
    const role = s.role || ''
    const result = overrides.value[i].result
    const rNotes = overrides.value[i].roleNotes
    const fko = i === 0 ? firstKO.value : ''
    const gEnd = i === 0 ? gameEnd.value : ''
    const gNotes = i === 0 ? gameNotes.value : ''
    return [d, player, deck, role, result, rNotes, fko, gEnd, gNotes].join('\t')
  })
  return lines.join('\n')
})

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(exportText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
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

function toggleResult(i) {
  overrides.value[i].result = overrides.value[i].result === 'Win' ? 'Loss' : 'Win'
}
</script>

<template>
  <div class="export-overlay" @click.self="emit('close')">
    <div class="export-panel">
      <h3 class="font-beleren text-mtg-gold mb-4">Export Game</h3>

      <!-- Date -->
      <div class="export-field">
        <label class="field-label">Date</label>
        <input v-model="date" class="field-input" />
      </div>

      <!-- Player rows -->
      <div class="export-rows">
        <div v-for="(s, i) in seats" :key="i" class="export-row">
          <span class="export-player font-beleren">{{ s.player }}</span>
          <span class="export-deck">{{ s.deck?.name }}</span>
          <span class="export-role" v-if="s.role">{{ s.role }}</span>
          <button
            class="export-result"
            :class="overrides[i].result === 'Win' ? 'result-win' : 'result-loss'"
            @click="toggleResult(i)"
          >{{ overrides[i].result }}</button>
          <input
            v-model="overrides[i].roleNotes"
            class="export-notes"
            placeholder="Role Notes"
          />
        </div>
      </div>

      <!-- Game fields -->
      <div class="export-game-fields">
        <div class="export-field">
          <label class="field-label">First KO</label>
          <input v-model="firstKO" class="field-input field-input-narrow" />
        </div>
        <div class="export-field">
          <label class="field-label">Game End</label>
          <input v-model="gameEnd" class="field-input field-input-narrow" />
        </div>
        <div class="export-field">
          <label class="field-label">Game Notes</label>
          <input v-model="gameNotes" class="field-input field-input-wide" placeholder="Optional notes" />
        </div>
      </div>

      <!-- Preview -->
      <div class="export-preview">
        <table class="preview-table">
          <thead>
            <tr>
              <th>Date</th><th>Player</th><th>Deck</th><th>Role</th><th>Result</th><th>Role Notes</th><th>1st KO</th><th>End</th><th>Game Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in seats" :key="i">
              <td>{{ i === 0 ? date : '' }}</td>
              <td>{{ s.player }}</td>
              <td>{{ s.deck?.name }}</td>
              <td>{{ s.role || '' }}</td>
              <td>{{ overrides[i].result }}</td>
              <td>{{ overrides[i].roleNotes }}</td>
              <td>{{ i === 0 ? firstKO : '' }}</td>
              <td>{{ i === 0 ? gameEnd : '' }}</td>
              <td>{{ i === 0 ? gameNotes : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Actions -->
      <div class="export-actions">
        <button class="export-btn export-btn-copy" @click="copyToClipboard">
          {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
        </button>
        <button class="export-btn export-btn-finish" @click="emit('finish')">Save & End Game</button>
        <button class="export-btn export-btn-cancel" @click="emit('close')">Cancel</button>
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
  max-height: 85vh;
  overflow-y: auto;
}

.export-field {
  margin-bottom: 12px;
}

.field-label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 4px;
}

.field-input {
  font-family: 'EB Garamond', serif;
  font-size: 1rem;
  padding: 8px 12px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #d4c8a8;
  outline: none;
  width: 120px;
}

.field-input-narrow {
  width: 60px;
}

.field-input:focus {
  border-color: #c9a54e66;
}

.export-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.export-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #1a1612;
  border: 1px solid #3d352966;
  border-radius: 3px;
}

.export-player {
  font-size: 0.9rem;
  color: #d4c8a8;
  min-width: 70px;
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

.export-role {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  color: #8a7e66;
}

.export-result {
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  padding: 4px 12px;
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

.export-notes {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  outline: none;
  width: 80px;
}

.export-fko {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  outline: none;
  width: 40px;
  text-align: center;
}

.export-fko:focus,
.export-notes:focus {
  border-color: #c9a54e66;
}

.export-game-fields {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.field-input-wide {
  width: 200px;
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

.export-btn-finish {
  color: #d4c8a8;
  border-color: #3d3529;
  background: #231f1a;
}

.export-btn-finish:hover {
  border-color: #8a7e66;
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
