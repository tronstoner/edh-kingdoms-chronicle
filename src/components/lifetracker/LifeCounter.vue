<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useLifeCounter } from '../../composables/useLifeCounter.js'

const props = defineProps({
  rotated: Boolean,
  disabled: Boolean,
})

watch(() => props.disabled, (val) => {
  if (val) stop()
})

const emit = defineEmits(['changeLife'])

const pendingDelta = ref(0)
let clearDeltaTimer = null

const { start, stop, getSign } = useLifeCounter((delta) => {
  emit('changeLife', delta)
  pendingDelta.value += delta
  clearTimeout(clearDeltaTimer)
  clearDeltaTimer = setTimeout(() => { pendingDelta.value = 0 }, 2000)
})

const el = ref(null)
const flashSide = ref(null)
let flashTimeout = null

function handleDown(event) {
  if (!el.value || props.disabled) return
  // Capture the pointer so the whole down→up sequence is delivered here even
  // if the finger drifts a few px off the zone — otherwise iOS can deliver the
  // pointerup elsewhere and the tap is silently lost. Guard: throws if the
  // pointerId is already gone.
  try { el.value.setPointerCapture(event.pointerId) } catch { /* ignore */ }
  const sign = getSign(event, el.value, props.rotated)
  flashSide.value = sign < 0 ? 'left' : 'right'
  clearTimeout(flashTimeout)
  flashTimeout = setTimeout(() => { flashSide.value = null }, 150)
  start(sign)
}

function handleUp() {
  stop()
}

onUnmounted(() => {
  stop()
  clearTimeout(flashTimeout)
  clearTimeout(clearDeltaTimer)
})
</script>

<template>
  <div
    ref="el"
    class="life-counter"
    @contextmenu.prevent
    @pointerdown.prevent="handleDown"
    @pointerup.prevent="handleUp"
    @pointercancel="handleUp"
    @pointerleave="handleUp"
  >
    <div class="zone zone-minus" :class="{ flash: flashSide === 'left' }">
      <span class="zone-label">&minus;</span>
    </div>
    <div class="zone zone-plus" :class="{ flash: flashSide === 'right' }">
      <span class="zone-label">+</span>
    </div>
    <Transition name="delta">
      <div v-if="pendingDelta !== 0" class="pending-delta" :class="pendingDelta > 0 ? 'delta-pos' : 'delta-neg'">
        {{ pendingDelta > 0 ? '+' : '' }}{{ pendingDelta }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.life-counter {
  position: absolute;
  inset: 0;
  display: flex;
  z-index: 1;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}

.zone {
  flex: 1;
  display: flex;
  align-items: center;
  transition: background-color 0.15s;
}

.zone-minus {
  justify-content: center;
  padding-right: 10%;
}

.zone-plus {
  justify-content: center;
  padding-left: 10%;
}

.zone-label {
  font-family: 'Cinzel', serif;
  font-size: clamp(1.1rem, 10cqmin, 2.5rem);
  color: var(--lt-text);
  transition: color 0.15s;
  pointer-events: none;
}

.zone:active .zone-label,
.flash .zone-label {
  color: var(--lt-text);
}

.flash.zone-minus {
  background: color-mix(in srgb, var(--lt-role-goblin) 22%, transparent);
}

.flash.zone-plus {
  background: color-mix(in srgb, var(--lt-role-knight) 22%, transparent);
}

.pending-delta {
  position: absolute;
  top: 22%;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Cinzel', serif;
  font-weight: 700;
  font-size: clamp(0.85rem, 6cqmin, 1.5rem);
  pointer-events: none;
  z-index: 3;
}

.delta-pos {
  color: var(--lt-role-knight);
}

.delta-neg {
  color: var(--lt-role-goblin);
}

/* Pop in from below on first delta, drift out to above on clear. The
   parent transform: translateX(-50%) is preserved in every keyframe so
   the horizontal centring doesn't snap. */
.delta-enter-active,
.delta-leave-active {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.delta-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

.delta-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
