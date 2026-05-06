<script setup>
import { ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps({
  turnCount: Number,
  vertical: Boolean,
})

const emit = defineEmits(['advanceTurn', 'endGame', 'export', 'newGame', 'back'])

const showMore = ref(false)
const showConfirmNew = ref(false)
const isFullscreen = ref(!!document.fullscreenElement)

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

document.addEventListener('fullscreenchange', () => {
  isFullscreen.value = !!document.fullscreenElement
})

// Hold-to-decrement for turn counter
let holdTimer = null
let holdFired = false

function onTurnPointerDown() {
  holdFired = false
  holdTimer = setTimeout(() => {
    holdFired = true
    emit('advanceTurn', -1)
  }, 500)
}

function onTurnPointerUp() {
  clearTimeout(holdTimer)
  if (!holdFired) {
    emit('advanceTurn', 1)
  }
}

function onTurnPointerLeave() {
  clearTimeout(holdTimer)
}
</script>

<template>
  <div class="inline-menu" :class="{ 'inline-menu--vertical': vertical }">
    <!-- Turn cycle indicator / button -->
    <button
      class="menu-icon turn-btn"
      @pointerdown.prevent="onTurnPointerDown"
      @pointerup="onTurnPointerUp"
      @pointerleave="onTurnPointerLeave"
      @contextmenu.prevent
      title="Tap: next turn. Hold: undo"
    >
      <i class="ms ms-planeswalker turn-icon"></i>
      <span class="turn-label font-beleren">{{ turnCount }}</span>
    </button>

    <!-- More options -->
    <button
      class="menu-icon"
      :class="{ active: showMore }"
      @click="showMore = !showMore"
      title="More options"
    >
      <i class="ms ms-battle"></i>
    </button>

    <!-- Fullscreen toggle -->
    <button
      class="menu-icon"
      @click="toggleFullscreen"
      :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
    >
      <span class="fullscreen-icon">{{ isFullscreen ? '◱' : '⛶' }}</span>
    </button>

    <!-- Spacers fill remaining gap -->
    <div v-if="vertical" class="menu-spacer menu-spacer--before" style="order: -1"></div>
    <div class="menu-spacer"></div>

    <!-- Options modal -->
    <Teleport to="body">
      <div v-if="showMore" class="menu-modal-overlay" @click.self="showMore = false">
        <div class="menu-modal-panel">
          <button class="menu-btn menu-btn-save" @click="emit('endGame'); showMore = false">End Game</button>
          <button class="menu-btn" @click="emit('export'); showMore = false">Export Session</button>
          <button class="menu-btn" @click="showConfirmNew = true; showMore = false">Discard Game</button>
          <button class="menu-btn" @click="emit('back'); showMore = false">Back to Dashboard</button>
          <button class="menu-btn menu-btn-cancel" @click="showMore = false">Cancel</button>
        </div>
      </div>
    </Teleport>

    <!-- Confirm discard -->
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
.inline-menu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
  position: relative;
  width: 100%;
  height: 100%;
}

.inline-menu--vertical {
  flex-direction: column;
}

.menu-icon {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1612;
  border: 1px solid #3d3529;
  border-radius: 3px;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.3rem;
  padding: 0;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.menu-icon:hover,
.menu-icon.active {
  color: #c9a54e;
  border-color: #8a7e66;
}

.turn-btn {
  height: 88px;
  flex-direction: column;
  gap: 4px;
  color: #c9a54e;
  border-color: #c9a54e44;
}

.turn-icon {
  font-size: 1.6rem;
}

.turn-label {
  font-size: 1rem;
  line-height: 1;
}

.fullscreen-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.menu-spacer {
  flex: 1;
  width: 100%;
  background: #1a1612;
  border: 1px solid #3d3529;
  border-radius: 3px;
  min-height: 0;
}


:global(.menu-modal-overlay) {
  position: fixed;
  inset: 0;
  background: #1a1612ee;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 250;
}

:global(.menu-modal-panel) {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 3px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 92vw;
  max-width: 320px;
}

:global(.menu-modal-panel .menu-btn) {
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
  text-align: left;
}

:global(.menu-modal-panel .menu-btn:hover) {
  border-color: #8a7e66;
  color: #d4c8a8;
}

:global(.menu-modal-panel .menu-btn-save) {
  color: #c9a54e;
  border-color: #c9a54e66;
}

:global(.menu-modal-panel .menu-btn-cancel) {
  color: #8a7e6688;
  border-color: transparent;
}
</style>
