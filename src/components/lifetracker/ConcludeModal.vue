<script setup>
import { computed, ref } from 'vue'
import { ROLE_COLORS, roleIconUrl, lifetrackerRoleLabel } from '../../roles.js'
import { HOUSE_COLORS, houseImageUrl, cycleRelations } from '../../lifetracker/cycle.js'
import { applyKingdomsCascades } from '../../lifetracker/kingdoms.js'
import { usePlayerDecks } from '../../composables/usePlayerDecks.js'

const ROLES = ['King', 'Knight', 'Goblin', 'Lord', 'Clone Lord']
const ROLE_NOTES = ['', 'Zombie', 'Clone', 'Suicide']
// Fixed role pools per player count — used to grey out chips that
// would push the table past its budget. Not enforced (the user can
// still click through to fix odd states).
const ROLE_BUDGETS = {
  5: { King: 1, Knight: 1, Goblin: 2, Lord: 1, 'Clone Lord': 0 },
  6: { King: 1, Knight: 1, Goblin: 2, Lord: 1, 'Clone Lord': 1 },
}

const props = defineProps({
  seats: Array,
  turnCount: Number,
  mode: { type: String, default: 'kingdoms' },
})

const emit = defineEmits(['save', 'saveAndExport', 'close'])

const { decksForPlayer } = usePlayerDecks()

const isCycle = computed(() => props.mode === 'cycle')

// Default winner pick for Cycle: the unique alive player whose nemesis + rival are both dead.
function defaultCycleWinner(idx) {
  const s = props.seats[idx]
  if (!s.house || s.isDead) return false
  const rel = cycleRelations(s.house)
  if (!rel) return false
  const houseDead = (house) => props.seats.some(o => o.house === house && o.isDead && !o.deathOverridden)
  return houseDead(rel.nemesis) && houseDead(rel.rival)
}

const rows = ref(props.seats.map((s, i) => ({
  player: s.player,
  deck: s.deck?.name || '',
  // Colours / temp flag ride along so a corrected deck writes back a
  // complete deck object (Cycle export needs the colours).
  deckColors: s.deck?.colors || '',
  deckIsTemp: !!s.deck?.isTemp,
  role: s.role || '',
  house: s.house || '',
  result: s.isWinner ? 'Win' : (isCycle.value && defaultCycleWinner(i) ? 'Win' : (s.isDead ? 'Loss' : '')),
  roleNotes: s.roleNotes || '',
  // Tracks what the Kingdoms cascade last wrote into `result` so a
  // subsequent pass can revert its own effect and re-derive cleanly.
  cascadeResult: '',
  // Same idea for the last-role auto-reveal — once the user empties
  // a role, don't let the utility put it back on the next sync.
  roleClearedByUser: false,
})))

const firstKO = ref((() => {
  const deaths = props.seats.filter(s => s.deathTurn !== null).sort((a, b) => a.deathTurn - b.deathTurn)
  return deaths.length > 0 ? String(deaths[0].deathTurn) : ''
})())

const gameEnd = ref(String(props.turnCount || ''))

function toggleResult(i) {
  const cur = rows.value[i].result
  rows.value[i].result = cur === 'Win' ? 'Loss' : cur === 'Loss' ? '' : 'Win'
  syncKingdomsCascades()
}

function selectRole(i, role) {
  const next = rows.value[i].role === role ? '' : role
  rows.value[i].role = next
  rows.value[i].roleClearedByUser = !next
  syncKingdomsCascades()
}

function onRoleNotesChange() {
  syncKingdomsCascades()
}

// Deck options for a row's player, always including the deck currently on
// the row (in case it was a temp / unregistered deck used in-game).
function deckOptionsFor(i) {
  const row = rows.value[i]
  const opts = decksForPlayer(row.player)
  if (row.deck && !opts.some(d => d.name === row.deck)) {
    opts.unshift({ name: row.deck, colors: row.deckColors, isTemp: row.deckIsTemp })
  }
  return opts
}

function onDeckChange(i) {
  const row = rows.value[i]
  const match = decksForPlayer(row.player).find(d => d.name === row.deck)
  if (match) {
    row.deckColors = match.colors
    row.deckIsTemp = match.isTemp
  }
}

// Per-row, per-role availability based on the fixed role budget.
// Active chips always read as available so the current pick isn't
// shown as "exhausted" against itself.
const roleAvailability = computed(() => {
  const budget = ROLE_BUDGETS[rows.value.length]
  if (!budget) return null
  const totals = {}
  for (const r of rows.value) {
    if (!r.role) continue
    const k = r.role === 'Zombie Lord' ? 'Lord' : r.role
    totals[k] = (totals[k] || 0) + 1
  }
  return rows.value.map((row) => {
    const rowKey = row.role === 'Zombie Lord' ? 'Lord' : row.role
    const map = {}
    for (const role of ROLES) {
      const cap = budget[role] ?? 0
      const used = totals[role] || 0
      // Subtract this row's own contribution so the active chip stays available.
      const usedByOthers = role === rowKey ? used - 1 : used
      map[role] = usedByOthers < cap
    }
    return map
  })
})

// Re-run the Kingdoms automation against the user's current edits.
// Fully state-driven: any row.result the cascade owned last time is
// reverted before re-deriving, so undoing a trigger (e.g. clearing
// the Lord's "Loss") correctly drops the consequences it caused
// (Knight death, King/Knight win, Zombie deaths). A row the user has
// since manually overridden stays as the user set it.
function syncKingdomsCascades() {
  if (isCycle.value) return
  // Step 1 — revert any prior cascade effect on the result column.
  for (const r of rows.value) {
    if (r.cascadeResult && r.result === r.cascadeResult) {
      r.result = ''
    }
    r.cascadeResult = ''
  }
  // Step 2 — build work seats from the user-set base state.
  const work = rows.value.map(r => ({
    role: r.role || null,
    roleNotes: r.roleNotes || null,
    isDead: r.result === 'Loss',
    deathOverridden: false,
    isWinner: r.result === 'Win',
    deathTurn: null,
    roleClearedByUser: !!r.roleClearedByUser,
  }))
  // Step 3 — apply cascades; the utility tags newly cascade-set work
  // seats via cascadeKilled / cascadeWonBy.
  applyKingdomsCascades(work, props.turnCount || 0)
  // Step 4 — write back; remember which rows the cascade owns now so
  // the next sync can revert them.
  for (let i = 0; i < rows.value.length; i++) {
    const w = work[i]
    if (w.role && !rows.value[i].role) rows.value[i].role = w.role
    if (w.cascadeWonBy) {
      rows.value[i].result = 'Win'
      rows.value[i].cascadeResult = 'Win'
    } else if (w.cascadeKilled && rows.value[i].result !== 'Win') {
      rows.value[i].result = 'Loss'
      rows.value[i].cascadeResult = 'Loss'
    }
  }
}

// Run once on mount in case the seats came in pre-edited but the
// cascade is owed a follow-up (e.g. an unrevealed role got picked
// elsewhere before the modal opened).
syncKingdomsCascades()

function getData() {
  return {
    seats: rows.value,
    firstKO: firstKO.value,
    gameEnd: gameEnd.value,
  }
}

function handleSave() {
  emit('save', getData())
}

function handleSaveAndExport() {
  emit('saveAndExport', getData())
}
</script>

<template>
  <div class="conclude-overlay" @click.self="emit('close')">
    <div class="conclude-panel">
      <button class="lt-modal-close" @click="emit('close')" aria-label="Close">×</button>
      <h3 class="font-beleren text-mtg-gold mb-4">End Game</h3>

      <div class="conclude-rows">
        <div v-for="(r, i) in rows" :key="i" class="conclude-row">
          <div class="row-top">
            <span class="row-player font-beleren">{{ r.player || `Seat ${i + 1}` }}</span>
            <select v-model="r.deck" class="row-select row-deck-select" @change="onDeckChange(i)">
              <option value="">— deck —</option>
              <option v-for="d in deckOptionsFor(i)" :key="d.name" :value="d.name">{{ d.name }}</option>
            </select>
            <span
              v-if="isCycle && r.house"
              class="row-house"
              :style="{ color: HOUSE_COLORS[r.house], borderColor: HOUSE_COLORS[r.house] + '88' }"
            >
              <img class="row-house-img" :src="houseImageUrl(r.house)" alt="" />
              {{ r.house }}
            </span>
            <button
              class="row-result"
              :class="{ 'result-win': r.result === 'Win', 'result-loss': r.result === 'Loss' }"
              @click="toggleResult(i)"
            >{{ r.result || '—' }}</button>
            <select v-if="!isCycle" v-model="r.roleNotes" class="row-select" @change="onRoleNotesChange">
              <option v-for="rn in ROLE_NOTES" :key="rn" :value="rn">{{ rn || '—' }}</option>
            </select>
          </div>
          <div v-if="!isCycle" class="row-roles">
            <button
              v-for="role in ROLES"
              :key="role"
              class="role-chip"
              :class="{
                active: r.role === role,
                'role-chip-exhausted': roleAvailability && r.role !== role && !roleAvailability[i][role],
              }"
              :style="r.role === role ? { color: ROLE_COLORS[role], borderColor: ROLE_COLORS[role] + '88' } : {}"
              @click="selectRole(i, role)"
            >
              <img class="role-chip-icon" :src="roleIconUrl(role)" alt="" />
              <span class="role-chip-label">{{ lifetrackerRoleLabel(role) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Game fields -->
      <div class="conclude-fields">
        <label class="conclude-field"><span class="field-label">1st KO</span><input v-model="firstKO" class="field-input field-narrow" /></label>
        <label class="conclude-field"><span class="field-label">Game End</span><input v-model="gameEnd" class="field-input field-narrow" /></label>
      </div>

      <div class="conclude-actions">
        <button class="conclude-btn conclude-btn-save" @click="handleSave">Save & Next Game</button>
        <button class="conclude-btn conclude-btn-export" @click="handleSaveAndExport">Save & Export Session</button>
        <button class="conclude-btn conclude-btn-cancel" @click="emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conclude-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--lt-bg) 93%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.conclude-panel {
  position: relative;
  background: var(--lt-panel-bg);
  border: 2px solid var(--lt-border);
  border-radius: 3px;
  padding: 24px;
  width: 98vw;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.conclude-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.conclude-row {
  border: 1px solid var(--lt-border);
  border-radius: 3px;
  padding: 12px;
  background: var(--lt-bg);
}

.row-top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.row-player {
  font-size: 1rem;
  color: var(--lt-text);
  min-width: 70px;
}

.row-house {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid;
  border-radius: 3px;
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
}

.row-house-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.row-deck-select {
  flex: 1;
  min-width: 0;
  font-style: italic;
  color: var(--lt-text-dim);
}

.row-result {
  font-family: 'Cinzel', serif;
  font-size: 0.9rem;
  padding: 6px 0;
  width: 55px;
  text-align: center;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: none;
  color: color-mix(in srgb, var(--lt-text-dim) 40%, transparent);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.result-win {
  color: var(--lt-gold);
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
  background: color-mix(in srgb, var(--lt-gold) 7%, transparent);
}

.result-loss {
  color: var(--lt-text-dim);
  border-color: var(--lt-border);
}

.row-select {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  padding: 6px 8px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-panel-bg);
  color: var(--lt-text);
  outline: none;
  cursor: pointer;
}

.row-roles {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.role-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: none;
  color: color-mix(in srgb, var(--lt-text-dim) 40%, transparent);
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.role-chip:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text-dim);
}

.role-chip.active {
  background: color-mix(in srgb, var(--lt-bg) 53%, transparent);
}

/* Role budget already filled by other rows — hint that this would push
   past the legal Kingdoms role pool, but stay clickable so users can
   still recover from a weird state. */
.role-chip-exhausted {
  opacity: 0.32;
}

.role-chip-exhausted .role-chip-icon {
  filter: grayscale(100%);
}

.role-chip-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
}

.role-chip-label {
  font-size: 0.75rem;
}

.conclude-fields {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.conclude-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-label {
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  color: var(--lt-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-input {
  font-family: 'EB Garamond', serif;
  font-size: 0.95rem;
  padding: 6px 10px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-panel-bg);
  color: var(--lt-text);
  outline: none;
}

.field-input:focus {
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
}

.field-narrow {
  width: 55px;
  text-align: center;
}

.conclude-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.conclude-btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 14px 32px;
  border-radius: 3px;
  border: 1px solid;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.conclude-btn-save {
  color: var(--lt-gold);
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
}

.conclude-btn-save:hover {
  background: color-mix(in srgb, var(--lt-gold) 20%, transparent);
  border-color: var(--lt-gold);
}

.conclude-btn-export {
  color: var(--lt-text);
  border-color: var(--lt-border);
  background: var(--lt-panel-bg);
}

.conclude-btn-export:hover {
  border-color: var(--lt-text-dim);
}

.conclude-btn-cancel {
  color: var(--lt-text-dim);
  border-color: color-mix(in srgb, var(--lt-border) 40%, transparent);
  background: none;
}

.conclude-btn-cancel:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}
</style>
