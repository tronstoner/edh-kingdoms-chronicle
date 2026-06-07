<script setup>
import { ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useFullscreen } from '../../composables/useFullscreen.js'

const props = defineProps({
  turnCount: Number,
  vertical: Boolean,
  // Drives the gold pulse on the turn-cycle button. The parent computes
  // this from the per-round threshold (settings + elapsed time).
  nudgeActive: { type: Boolean, default: false },
})

const emit = defineEmits(['advanceTurn', 'endGame', 'export', 'newGame', 'back', 'openSettings'])

const showMore = ref(false)
const showConfirmNew = ref(false)
const { isFullscreen, canToggleFullscreen, toggleFullscreen } = useFullscreen()

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
      :class="{ 'turn-btn--prompt': nudgeActive }"
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

    <!-- Fullscreen toggle (hidden when API unavailable or already in standalone PWA) -->
    <button
      v-if="canToggleFullscreen"
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
          <button class="menu-btn" @click="emit('openSettings'); showMore = false">Settings</button>
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
  aspect-ratio: 1 / 1;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1612;
  border: 1px solid #3d3529;
  border-radius: 3px;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
  /* Sized to the container (menu gap / column) so the icons scale with
     the gap width — iPad gap 64px → ~1.3rem, phone gap 40px → ~0.9rem. */
  font-size: clamp(0.9rem, 32cqmin, 1.3rem);
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
  aspect-ratio: auto;
  /* Double-height button: 200cqmin = 2× the gap width (which is 1cqmin
     in cqmin terms × 100 = 100). iPad gap 64 → 128px, phone gap 40 → 80px. */
  height: clamp(80px, 200cqmin, 128px);
  flex-direction: column;
  gap: 6px;
  color: #c9a54e;
  border-color: #c9a54e44;
}

/* Round 0 nudge — when the counter hasn't been advanced yet, pulse
   the button so the table remembers to tap it on the first turn. The
   pulse alternates border / glow strength and dims back to the resting
   look so it's noticeable without strobing in peripheral vision. */
.turn-btn--prompt {
  animation: turn-pulse 1.8s ease-in-out infinite;
}

@keyframes turn-pulse {
  0%,
  100% {
    background-color: #1a1612;
    border-color: #c9a54e44;
  }
  50% {
    /* Gold wash over the resting dark — the whole button breathes
       in/out of the gold rather than just a halo at the edge. */
    background-color: #6a4e1f;
    border-color: #c9a54e;
  }
}

@media (prefers-reduced-motion: reduce) {
  .turn-btn--prompt {
    animation: none;
    border-color: #c9a54e;
  }
}

.turn-icon {
  font-size: clamp(1.4rem, 50cqmin, 2rem);
}

.turn-label {
  font-size: clamp(1.1rem, 40cqmin, 1.6rem);
  line-height: 1;
}

.fullscreen-icon {
  font-size: clamp(1rem, 35cqmin, 1.4rem);
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
