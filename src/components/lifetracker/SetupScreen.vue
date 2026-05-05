<script setup>
import { computed } from 'vue'
import { defaultLayout } from '../../composables/useTableLayouts.js'
import LayoutPicker from './LayoutPicker.vue'

const props = defineProps({
  playerCount: Number,
  layoutId: String,
})

const emit = defineEmits(['setCount', 'setLayout', 'start', 'export', 'back'])

const selectedCount = computed(() => props.playerCount)
const selectedLayout = computed(() => props.layoutId)

function handleCountChange(count) {
  emit('setCount', count, defaultLayout(count).id)
}
</script>

<template>
  <div class="setup-screen">
    <h2 class="font-beleren text-mtg-gold text-xl mb-6">New Game</h2>

    <!-- Player count -->
    <div class="section-label">Players</div>
    <div class="count-btns mb-4">
      <button
        v-for="n in [5, 6]"
        :key="n"
        class="count-btn"
        :class="{ active: selectedCount === n }"
        @click="handleCountChange(n)"
      >
        {{ n }}
      </button>
    </div>

    <!-- Layout -->
    <div class="section-label">Table Layout</div>
    <LayoutPicker
      :player-count="selectedCount"
      :selected="selectedLayout"
      @select="(id) => emit('setLayout', id)"
    />

    <!-- Actions -->
    <div class="actions mt-6">
      <button class="start-btn" @click="emit('start')">Start Game</button>
      <button class="back-btn" @click="emit('export')">Export Session</button>
      <button class="back-btn" @click="emit('back')">Back to Dashboard</button>
    </div>
  </div>
</template>

<style scoped>
.setup-screen {
  padding: 24px;
  max-width: 420px;
  margin: 0 auto;
}

.section-label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  color: #8a7e66;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.count-btns {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.count-btn {
  font-family: 'Cinzel', serif;
  font-size: 1.4rem;
  width: 64px;
  height: 64px;
  border-radius: 3px;
  border: 2px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  cursor: pointer;
  transition: all 0.2s;
}

.count-btn:hover {
  border-color: #8a7e66;
}

.count-btn.active {
  border-color: #c9a54e;
  background: #c9a54e22;
  color: #c9a54e;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.start-btn {
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  padding: 16px 40px;
  border-radius: 3px;
  border: 2px solid #c9a54e66;
  background: #c9a54e22;
  color: #c9a54e;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
}

.back-btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 12px 24px;
  border-radius: 3px;
  border: 1px solid #3d3529;
  background: none;
  color: #8a7e66;
  cursor: pointer;
}

.back-btn:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
