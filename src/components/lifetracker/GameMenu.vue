<script setup>
import { ref } from 'vue'

const props = defineProps({
  turnCount: Number,
})

const emit = defineEmits(['advanceTurn', 'endGame', 'export', 'newGame', 'back'])

const expanded = ref(false)
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
      <button class="menu-btn" @click="emit('newGame'); expanded = false">New Game</button>
      <button class="menu-btn" @click="emit('back'); expanded = false">Back to Dashboard</button>
    </div>
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
  background: #231f1a;
  border: 1px solid #3d3529;
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
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.menu-btn:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}

.menu-btn-save {
  color: #c9a54e;
  border-color: #c9a54e66;
}

.menu-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: #231f1aee;
  border: 1px solid #3d3529;
  border-bottom: none;
  border-radius: 3px 3px 0 0;
  cursor: pointer;
}

.menu-turn {
  color: #c9a54e;
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
  color: #8a7e66;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
  font-size: 1.3rem;
}

.menu-action:hover {
  color: #c9a54e;
  background: #c9a54e11;
}

.menu-dots {
  color: #8a7e66;
  font-size: 1.2rem;
  min-width: 24px;
  text-align: center;
}
</style>
