<script setup>
import { ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps({
  turnCount: Number,
})

const emit = defineEmits(['advanceTurn', 'endGame', 'export', 'newGame', 'back'])

const expanded = ref(false)
const showConfirmNew = ref(false)
</script>

<template>
  <div class="game-menu">
    <!-- Collapsed bar -->
    <div class="menu-bar" @click="expanded = !expanded">
      <span class="menu-turn font-beleren">T{{ turnCount }}</span>
      <button class="menu-action" @click.stop="emit('advanceTurn')" title="Next turn">&#x27F3;</button>
      <span class="menu-dots">{{ expanded ? '✕' : '⋯' }}</span>
    </div>

    <!-- Expanded menu -->
    <div v-if="expanded" class="menu-expanded">
      <button class="menu-btn menu-btn-save" @click="emit('endGame'); expanded = false">End Game</button>
      <button class="menu-btn" @click="emit('export'); expanded = false">Export Session</button>
      <button class="menu-btn" @click="showConfirmNew = true; expanded = false">Discard Game</button>
      <button class="menu-btn" @click="emit('back'); expanded = false">Back to Dashboard</button>
    </div>

    <!-- Confirm new game -->
    <Teleport to="body"><ConfirmDialog
      v-if="showConfirmNew"
      title="Discard Game"
      message="This will discard the current game without saving. Are you sure?"
      confirm-label="Discard"
      :danger="true"
      @confirm="showConfirmNew = false; emit('newGame')"
      @cancel="showConfirmNew = false"
    /></Teleport>
  </div>
</template>

<style scoped>
.game-menu {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.menu-expanded {
  background: var(--lt-panel-bg);
  border: 1px solid var(--lt-border);
  border-bottom: none;
  border-radius: 3px 3px 0 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-btn {
  font-family: 'Cinzel', serif;
  font-size: 0.9rem;
  padding: 10px 24px;
  border-radius: 3px;
  border: 1px solid var(--lt-border);
  background: var(--lt-bg);
  color: var(--lt-text-dim);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  white-space: nowrap;
}

.menu-btn:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}

.menu-btn-save {
  color: var(--lt-gold);
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
}

.menu-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: color-mix(in srgb, var(--lt-panel-bg) 93%, transparent);
  border: 1px solid var(--lt-border);
  border-bottom: none;
  border-radius: 3px 3px 0 0;
  cursor: pointer;
}

.menu-turn {
  color: var(--lt-gold);
  font-size: 1.1rem;
  min-width: 32px;
  text-align: center;
}

.menu-action {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--lt-text-dim);
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  font-size: 1.3rem;
}

.menu-action:hover {
  color: var(--lt-gold);
  background: color-mix(in srgb, var(--lt-gold) 7%, transparent);
}

.menu-dots {
  color: var(--lt-text-dim);
  font-size: 1.2rem;
  min-width: 24px;
  text-align: center;
}
</style>
