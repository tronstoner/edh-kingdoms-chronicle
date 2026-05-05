<script setup>
import { ref, onUnmounted } from 'vue'
import { useLifeCounter } from '../../composables/useLifeCounter.js'
import { manaGradient } from '../../composables/useManaGradient.js'

const props = defineProps({
  seat: Object,
  allSeats: Array,
  layoutRows: Array,
})

const emit = defineEmits(['change', 'changePoison', 'togglePoison', 'changeTax', 'close'])

// Per-seat tap interaction
const activeSeat = ref(null)
const flashSide = ref(null)
let flashTimeout = null
const counterEls = ref({})

function setCounterEl(si, el) {
  if (el) counterEls.value[si] = el
}

const { start, stop, getSign } = useLifeCounter((delta) => {
  if (activeSeat.value !== null) {
    emit('change', props.seat.index, activeSeat.value, 1, delta)
  }
})

function handleDown(event, si) {
  const el = counterEls.value[si]
  if (!el) return
  activeSeat.value = si
  const sign = getSign(event, el, false)
  flashSide.value = { seat: si, side: sign < 0 ? 'left' : 'right' }
  clearTimeout(flashTimeout)
  flashTimeout = setTimeout(() => { flashSide.value = null }, 150)
  start(sign)
}

function handleUp() {
  stop()
  activeSeat.value = null
}

function seatGradStyle(si) {
  const s = props.allSeats?.[si]
  const grad = manaGradient(s?.deck?.colors || '')
  if (grad === 'transparent') return {}
  return { background: grad }
}

function dmgFrom(si) {
  const d = props.seat.commanderDamage[si]
  if (!d) return 0
  return d.cmd1 + d.cmd2
}

function isFlash(si, side) {
  return flashSide.value && flashSide.value.seat === si && flashSide.value.side === side
}

onUnmounted(() => {
  stop()
  clearTimeout(flashTimeout)
})
</script>

<template>
  <div class="cmd-overlay" @click.self="emit('close')">
    <div class="cmd-panel" @click.stop>
      <!-- Player name -->
      <div class="cmd-title font-beleren">{{ seat.player }}</div>

      <!-- Counters row -->
      <div class="counters-row">
        <div class="counter-item">
          <span class="counter-label">&#x2620; Poison</span>
          <div class="counter-controls">
            <button class="counter-btn" @click="emit('changePoison', -1)" :disabled="!seat.poisonEnabled || seat.poison <= 0">&minus;</button>
            <span class="counter-val" :class="{ active: seat.poisonEnabled && seat.poison > 0, lethal: seat.poison >= 10 }">{{ seat.poisonEnabled ? seat.poison : 'off' }}</span>
            <button class="counter-btn" @click="seat.poisonEnabled ? emit('changePoison', 1) : emit('togglePoison')">{{ seat.poisonEnabled ? '+' : 'on' }}</button>
          </div>
        </div>
        <div class="counter-item">
          <span class="counter-label">Tax</span>
          <div class="counter-controls">
            <button class="counter-btn" @click="emit('changeTax', -1)" :disabled="seat.commanderTax <= 0">&minus;</button>
            <span class="counter-val" :class="{ active: seat.commanderTax > 0 }">{{ seat.commanderTax }}</span>
            <button class="counter-btn" @click="emit('changeTax', 1)">+</button>
          </div>
        </div>
      </div>

      <!-- Enlarged table layout -->
      <div class="cmd-layout">
        <div v-for="(row, ri) in layoutRows" :key="ri" class="cmd-row">
          <div
            v-for="si in row.seats"
            :key="si"
            :ref="(el) => setCounterEl(si, el)"
            class="cmd-seat"
            :class="{ 'cmd-self': si === seat.index }"
            @pointerdown.prevent="handleDown($event, si)"
            @pointerup.prevent="handleUp"
            @pointercancel="handleUp"
            @pointerleave="handleUp"
          >
            <div class="cmd-seat-grad" :style="seatGradStyle(si)"></div>
            <div class="cmd-seat-flash cmd-flash-left" :class="{ flash: isFlash(si, 'left') }"></div>
            <div class="cmd-seat-flash cmd-flash-right" :class="{ flash: isFlash(si, 'right') }"></div>
            <div class="cmd-seat-content">
              <div class="cmd-seat-name">{{ allSeats[si]?.player }}</div>
              <div class="cmd-seat-dmg" :class="{ 'has-dmg': dmgFrom(si) > 0, lethal: dmgFrom(si) >= 21 }">{{ dmgFrom(si) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cmd-overlay {
  position: fixed;
  inset: 0;
  background: #1a1612dd;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.cmd-panel {
  width: 88%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cmd-title {
  text-align: center;
  font-size: 1.1rem;
  color: #c9a54e;
}

/* Counters row */
.counters-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.counter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #231f1a;
  border: 1px solid #3d3529;
  border-radius: 8px;
  padding: 8px 12px;
}

.counter-label {
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  color: #8a7e66;
}

.counter-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.counter-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #d4c8a8;
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.counter-btn:hover:not(:disabled) {
  border-color: #c9a54e66;
  background: #c9a54e11;
}

.counter-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.counter-val {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  color: #8a7e6666;
  min-width: 28px;
  text-align: center;
}

.counter-val.active {
  color: #d4c8a8;
}

.counter-val.lethal {
  color: #d95555;
}

/* Enlarged layout */
.cmd-layout {
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-radius: 10px;
  overflow: hidden;
}

.cmd-row {
  display: flex;
  gap: 3px;
}

.cmd-seat {
  flex: 1;
  position: relative;
  height: clamp(80px, 18vw, 120px);
  overflow: hidden;
  border-radius: 6px;
  touch-action: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cmd-seat-grad {
  position: absolute;
  inset: 0;
  opacity: 0.3;
}

.cmd-self {
  opacity: 0.4;
}

.cmd-seat-flash {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  transition: background-color 0.15s;
}

.cmd-flash-left {
  left: 0;
}

.cmd-flash-right {
  right: 0;
}

.cmd-flash-left.flash {
  background: #d9555511;
}

.cmd-flash-right.flash {
  background: #6ab86a11;
}

.cmd-seat-content {
  position: relative;
  z-index: 1;
  text-align: center;
  pointer-events: none;
}

.cmd-seat-name {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.6rem, 2vw, 0.8rem);
  color: #d4c8a888;
  margin-bottom: 2px;
}

.cmd-seat-dmg {
  font-family: 'Cinzel', serif;
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  font-weight: 700;
  color: #d4c8a844;
}

.cmd-seat-dmg.has-dmg {
  color: #d4c8a8;
}

.cmd-seat-dmg.lethal {
  color: #d95555;
}
</style>
