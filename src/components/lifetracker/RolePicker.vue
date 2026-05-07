<script setup>
import { computed } from 'vue'
import { ROLE_COLORS, rolePortraitUrl, lifetrackerRoleLabel } from '../../roles.js'

const props = defineProps({
  seat: Object,
  allSeats: Array,
  playerCount: Number,
  rotated: Boolean,
})

const emit = defineEmits(['select', 'close'])

const ROLES_5 = ['King', 'Knight', 'Goblin', 'Goblin', 'Lord']
const ROLES_6 = ['King', 'Knight', 'Goblin', 'Goblin', 'Lord', 'Clone Lord']

const availableRoles = computed(() => {
  const all = props.playerCount === 6 ? [...ROLES_6] : [...ROLES_5]
  const used = props.allSeats
    .filter((s, i) => i !== props.seat.index && s.role)
    .map(s => s.role)
  for (const r of used) {
    const idx = all.indexOf(r)
    if (idx !== -1) all.splice(idx, 1)
  }
  return [...new Set(all)]
})

function select(role) {
  emit('select', role)
}
</script>

<template>
  <div class="role-overlay" @click.self="emit('close')">
    <div class="role-panel" :style="{ transform: rotated ? 'rotate(180deg)' : undefined }">
      <div class="role-title font-beleren">{{ seat.player }}</div>
      <div class="role-subtitle">Reveal role</div>
      <div class="role-grid">
        <button
          v-for="role in availableRoles"
          :key="role"
          class="role-option"
          :style="{ borderColor: ROLE_COLORS[role] + '66' }"
          @click="select(role)"
        >
          <img class="role-portrait" :src="rolePortraitUrl(role)" :alt="role" />
          <span class="role-name" :style="{ color: ROLE_COLORS[role] }">{{ lifetrackerRoleLabel(role) }}</span>
        </button>
      </div>
      <button
        v-if="seat.role"
        class="role-clear-btn"
        @click="select(null)"
      >Clear role</button>
      <button class="role-close-btn" @click="emit('close')">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.role-overlay {
  position: fixed;
  inset: 0;
  background: #1a1612ee;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 250;
}

.role-panel {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 3px;
  padding: 32px;
  width: 94vw;
  max-width: 1000px;
  max-height: 92vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.role-title {
  font-size: 1.4rem;
  color: #d4c8a8;
}

.role-subtitle {
  font-family: 'EB Garamond', serif;
  font-size: 0.9rem;
  color: #8a7e66;
  font-style: italic;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, 220px);
  gap: 10px;
  justify-content: center;
  width: 100%;
}

.role-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 14px 18px;
  border-radius: 6px;
  border: 2px solid #3d3529;
  background: #1a1612;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  width: 100%;
}

.role-option:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}

.role-portrait {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

.role-name {
  font-family: 'Cinzel', serif;
  font-size: 1.25rem;
  letter-spacing: 0.02em;
}

.role-clear-btn {
  font-family: 'EB Garamond', serif;
  font-size: 0.9rem;
  padding: 8px 20px;
  border-radius: 3px;
  border: 1px solid #3d352966;
  background: none;
  color: #8a7e6688;
  cursor: pointer;
  transition: all 0.2s;
}

.role-clear-btn:hover {
  color: #d4c8a8;
  border-color: #8a7e66;
}

.role-close-btn {
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  padding: 16px 36px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: none;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
}

.role-close-btn:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
