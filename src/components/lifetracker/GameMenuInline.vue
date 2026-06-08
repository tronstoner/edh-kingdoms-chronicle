<script setup>
import { ref, computed } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useFullscreen } from '../../composables/useFullscreen.js'

const props = defineProps({
  turnCount: Number,
  vertical: Boolean,
  // Drives the gold pulse on the turn-cycle button. The parent computes
  // this from the per-round threshold (settings + elapsed time).
  nudgeActive: { type: Boolean, default: false },
  // 0..1 progress through the per-round threshold. Parent ticks this
  // once per second; the button's fuse ring and radial backdrop both
  // read it as a CSS variable and CSS transitions glide the jumps.
  fuseProgress: { type: Number, default: 0 },
  // Round's start timestamp — used as the :key on the fuse / radial
  // spans so they remount cleanly on round advance / undo (avoids the
  // transition animating progress backward to 0).
  fuseStartedAt: { type: String, default: null },
})

const emit = defineEmits(['advanceTurn', 'endGame', 'export', 'newGame', 'back', 'openSettings'])

const showFuse = computed(() => !!props.fuseStartedAt && props.fuseProgress > 0)
const fuseStyle = computed(() => ({
  '--fuse-progress': `${(Math.min(1, Math.max(0, props.fuseProgress)) * 100).toFixed(2)}%`,
}))

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
      <!-- Radial pie-fill backdrop: wedge sweeps clockwise from noon as
           the round burns down. Sits behind the icon/counter. -->
      <span
        v-if="showFuse"
        :key="`r${fuseStartedAt}`"
        class="turn-radial"
        :style="fuseStyle"
        aria-hidden="true"
      />
      <i class="ms ms-planeswalker turn-icon"></i>
      <span class="turn-label font-beleren">{{ turnCount }}</span>
      <!-- Fuse ring: same conic gradient masked to just the 2px border
           outline. Visible above everything inside the button. -->
      <span
        v-if="showFuse"
        :key="`f${fuseStartedAt}`"
        class="turn-fuse"
        :style="fuseStyle"
        aria-hidden="true"
      />
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
  background: var(--lt-bg);
  border: 1px solid var(--lt-border);
  border-radius: 3px;
  color: var(--lt-text-dim);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
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
  color: var(--lt-gold);
  border-color: var(--lt-text-dim);
}

.turn-btn {
  aspect-ratio: auto;
  /* Double-height button: 200cqmin = 2× the gap width (which is 1cqmin
     in cqmin terms × 100 = 100). iPad gap 64 → 128px, phone gap 40 → 80px. */
  height: clamp(80px, 200cqmin, 128px);
  flex-direction: column;
  gap: 6px;
  color: var(--lt-gold);
  border-color: color-mix(in srgb, var(--lt-gold) 27%, transparent);
  /* Needed so the absolute-positioned .turn-fuse anchors to this button. */
  position: relative;
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
    background-color: var(--lt-bg);
    border-color: color-mix(in srgb, var(--lt-gold) 27%, transparent);
  }
  50% {
    /* Gold wash over the resting dark — the whole button breathes
       in/out of the gold rather than just a halo at the edge. */
    background-color: #6a4e1f;
    border-color: var(--lt-gold);
  }
}

@media (prefers-reduced-motion: reduce) {
  .turn-btn--prompt {
    animation: none;
    border-color: var(--lt-gold);
  }
}

/* Registered custom property — without @property, CSS transitions
   on --fuse-progress would jump instantly. Registered as <percentage>
   so the value interpolates between each 1-second tick. */
@property --fuse-progress {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

/* Radial pie-fill — a subtle gold wedge behind the icon that grows
   clockwise from noon. Parent JS sets --fuse-progress once per second;
   the transition glides each step so jumps feel like a clock hand
   easing rather than popping. */
.turn-radial {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: conic-gradient(
    from 0deg,
    rgba(201, 165, 78, 0.22) var(--fuse-progress, 0%),
    transparent 0
  );
  z-index: 0;
  transition: --fuse-progress 280ms cubic-bezier(0.25, 0.85, 0.4, 1);
}

/* Fuse ring — same conic gradient at full opacity, masked to a 2px
   ring between border-box and content-box so only the outline shows. */
.turn-fuse {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  padding: 2px;
  box-sizing: border-box;
  pointer-events: none;
  background: conic-gradient(
    from 0deg,
    var(--lt-gold) var(--fuse-progress, 0%),
    transparent 0
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  z-index: 3;
  transition: --fuse-progress 280ms cubic-bezier(0.25, 0.85, 0.4, 1);
}

/* Keep the icon and counter visually above the radial backdrop. */
.turn-btn .turn-icon,
.turn-btn .turn-label {
  position: relative;
  z-index: 2;
}

@media (prefers-reduced-motion: reduce) {
  .turn-fuse,
  .turn-radial {
    display: none;
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
  background: var(--lt-bg);
  border: 1px solid var(--lt-border);
  border-radius: 3px;
  min-height: 0;
}


:global(.menu-modal-overlay) {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--lt-bg) 93%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 250;
}

:global(.menu-modal-panel) {
  background: var(--lt-panel-bg);
  border: 2px solid var(--lt-border);
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
  border: 1px solid var(--lt-border);
  background: var(--lt-bg);
  color: var(--lt-text-dim);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  white-space: nowrap;
  text-align: left;
}

:global(.menu-modal-panel .menu-btn:hover) {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}

:global(.menu-modal-panel .menu-btn-save) {
  color: var(--lt-gold);
  border-color: color-mix(in srgb, var(--lt-gold) 40%, transparent);
}

:global(.menu-modal-panel .menu-btn-cancel) {
  color: color-mix(in srgb, var(--lt-text-dim) 53%, transparent);
  border-color: transparent;
}
</style>
