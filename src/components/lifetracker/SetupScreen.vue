<script setup>
import { computed } from 'vue'
import { defaultLayout } from '../../composables/useTableLayouts.js'
import LayoutPicker from './LayoutPicker.vue'

const props = defineProps({
  mode: { type: String, default: 'kingdoms' },
  playerCount: Number,
  layoutId: String,
})

const emit = defineEmits(['setMode', 'setCount', 'setLayout', 'start', 'export', 'back'])

const selectedMode = computed(() => props.mode)
const selectedCount = computed(() => props.playerCount)
const selectedLayout = computed(() => props.layoutId)

const counts = computed(() => props.mode === 'cycle' ? [4] : [5, 6])
const showLayoutPicker = computed(() => props.mode !== 'cycle')

function handleModeChange(mode) {
  const defCount = mode === 'cycle' ? 4 : 5
  emit('setMode', mode, defCount, defaultLayout(defCount).id)
}

function handleCountChange(count) {
  emit('setCount', count, defaultLayout(count).id)
}
</script>

<template>
  <div class="setup-screen">
    <h2 class="font-beleren text-mtg-gold text-xl mb-6">New Game</h2>

    <!-- Mode -->
    <div class="section-label">Mode</div>
    <div class="mode-btns mb-4">
      <button
        class="mode-btn"
        :class="{ active: selectedMode === 'kingdoms' }"
        @click="handleModeChange('kingdoms')"
      >
        <span class="mode-name">Kingdoms</span>
        <span class="mode-desc">5–6 players · hidden roles</span>
      </button>
      <button
        class="mode-btn"
        :class="{ active: selectedMode === 'cycle' }"
        @click="handleModeChange('cycle')"
      >
        <span class="mode-name">The Cycle</span>
        <span class="mode-desc">4 players · open Houses</span>
      </button>
    </div>

    <!-- Player count -->
    <div class="section-label">Players</div>
    <div class="count-btns mb-4">
      <button
        v-for="n in counts"
        :key="n"
        class="count-btn"
        :class="{ active: selectedCount === n }"
        @click="handleCountChange(n)"
      >
        {{ n }}
      </button>
    </div>

    <!-- Layout -->
    <template v-if="showLayoutPicker">
      <div class="section-label">Table Layout</div>
      <LayoutPicker
        :player-count="selectedCount"
        :selected="selectedLayout"
        @select="(id) => emit('setLayout', id)"
      />
    </template>

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

.mode-btns {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 3px;
  border: 2px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.mode-btn:hover {
  border-color: #8a7e66;
}

.mode-btn.active {
  border-color: #c9a54e;
  background: #c9a54e22;
}

.mode-name {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  color: #d4c8a8;
}

.mode-btn.active .mode-name {
  color: #c9a54e;
}

.mode-desc {
  font-family: 'EB Garamond', serif;
  font-size: 0.8rem;
  font-style: italic;
  color: #8a7e66;
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
