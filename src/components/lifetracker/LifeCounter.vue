<script setup>
import { ref, onUnmounted } from 'vue'
import { useLifeCounter } from '../../composables/useLifeCounter.js'

const props = defineProps({
  rotated: Boolean,
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
  if (!el.value) return
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
    <div v-if="pendingDelta !== 0" class="pending-delta" :class="pendingDelta > 0 ? 'delta-pos' : 'delta-neg'">
      {{ pendingDelta > 0 ? '+' : '' }}{{ pendingDelta }}
    </div>
  </div>
</template>

<style scoped>
.life-counter {
  position: absolute;
  inset: 0;
  display: flex;
  z-index: 1;
  touch-action: none;
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
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  color: #8a7e6618;
  transition: color 0.15s;
  pointer-events: none;
}

.zone:active .zone-label,
.flash .zone-label {
  color: #8a7e6633;
}

.flash.zone-minus {
  background: #d9555511;
}

.flash.zone-plus {
  background: #6ab86a11;
}

.pending-delta {
  position: absolute;
  bottom: 30%;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Cinzel', serif;
  font-size: clamp(1rem, 3vw, 1.5rem);
  pointer-events: none;
  z-index: 3;
  animation: fadeUp 0.3s ease-out;
}

.delta-pos {
  color: #6ab86a99;
}

.delta-neg {
  color: #d9555599;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
