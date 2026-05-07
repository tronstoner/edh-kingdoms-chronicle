<script setup>
import { ref } from 'vue'
import { ROLE_COLORS, roleIconUrl, lifetrackerRoleLabel } from '../../roles.js'

const ROLES = ['King', 'Knight', 'Goblin', 'Lord', 'Clone Lord']
const ROLE_NOTES = ['', 'Zombie', 'Clone', 'Suicide']

const props = defineProps({
  seats: Array,
  turnCount: Number,
})

const emit = defineEmits(['save', 'saveAndExport', 'close'])

const rows = ref(props.seats.map(s => ({
  player: s.player,
  deck: s.deck?.name || '',
  role: s.role || '',
  result: s.isWinner ? 'Win' : (s.isDead ? 'Loss' : ''),
  roleNotes: s.roleNotes || '',
})))

const firstKO = ref((() => {
  const deaths = props.seats.filter(s => s.deathTurn !== null).sort((a, b) => a.deathTurn - b.deathTurn)
  return deaths.length > 0 ? String(deaths[0].deathTurn) : ''
})())

const gameEnd = ref(String(props.turnCount || ''))

function toggleResult(i) {
  const cur = rows.value[i].result
  rows.value[i].result = cur === 'Win' ? 'Loss' : cur === 'Loss' ? '' : 'Win'
}

function selectRole(i, role) {
  rows.value[i].role = rows.value[i].role === role ? '' : role
}

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
      <h3 class="font-beleren text-mtg-gold mb-4">End Game</h3>

      <div class="conclude-rows">
        <div v-for="(r, i) in rows" :key="i" class="conclude-row">
          <div class="row-top">
            <span class="row-player font-beleren">{{ r.player }}</span>
            <span class="row-deck">{{ r.deck }}</span>
            <button
              class="row-result"
              :class="{ 'result-win': r.result === 'Win', 'result-loss': r.result === 'Loss' }"
              @click="toggleResult(i)"
            >{{ r.result || '—' }}</button>
            <select v-model="r.roleNotes" class="row-select">
              <option v-for="rn in ROLE_NOTES" :key="rn" :value="rn">{{ rn || '—' }}</option>
            </select>
          </div>
          <div class="row-roles">
            <button
              v-for="role in ROLES"
              :key="role"
              class="role-chip"
              :class="{ active: r.role === role }"
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
  background: #1a1612ee;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.conclude-panel {
  background: #231f1a;
  border: 2px solid #3d3529;
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
  border: 1px solid #3d3529;
  border-radius: 3px;
  padding: 12px;
  background: #1a1612;
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
  color: #d4c8a8;
  min-width: 70px;
}

.row-deck {
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

.row-result {
  font-family: 'Cinzel', serif;
  font-size: 0.9rem;
  padding: 6px 0;
  width: 55px;
  text-align: center;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: none;
  color: #8a7e6666;
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
}

.row-select {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  padding: 6px 8px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
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
  border: 1px solid #3d3529;
  background: none;
  color: #8a7e6666;
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.role-chip:hover {
  border-color: #8a7e66;
  color: #8a7e66;
}

.role-chip.active {
  background: #1a161288;
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
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-input {
  font-family: 'EB Garamond', serif;
  font-size: 0.95rem;
  padding: 6px 10px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  outline: none;
}

.field-input:focus {
  border-color: #c9a54e66;
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
  transition: all 0.2s;
}

.conclude-btn-save {
  color: #c9a54e;
  border-color: #c9a54e66;
  background: #c9a54e22;
}

.conclude-btn-save:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
}

.conclude-btn-export {
  color: #d4c8a8;
  border-color: #3d3529;
  background: #231f1a;
}

.conclude-btn-export:hover {
  border-color: #8a7e66;
}

.conclude-btn-cancel {
  color: #8a7e66;
  border-color: #3d352966;
  background: none;
}

.conclude-btn-cancel:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
