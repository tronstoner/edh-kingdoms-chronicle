<script setup>
import { ref, onUnmounted } from 'vue'
import { useLifeCounter } from '../../composables/useLifeCounter.js'
import { manaGradient } from '../../composables/useManaGradient.js'

const props = defineProps({
  seat: Object,
  allSeats: Array,
  layoutRows: Array,
})

const emit = defineEmits(['change', 'togglePartners', 'changePoison', 'togglePoison', 'changeTax', 'close'])

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

function cmd1From(si) {
  return props.seat.commanderDamage[si]?.cmd1 || 0
}

function cmd2From(si) {
  return props.seat.commanderDamage[si]?.cmd2 || 0
}

function hasPartners(si) {
  return props.seat.commanderDamage[si]?.hasPartners || false
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
          <i class="ms ms-ability-phyrexian counter-icon poison-icon"></i>
          <div class="counter-controls">
            <button class="counter-btn" @click="emit('changePoison', -1)" :disabled="!seat.poisonEnabled || seat.poison <= 0">&minus;</button>
            <span class="counter-val" :class="{ active: seat.poisonEnabled && seat.poison > 0, lethal: seat.poison >= 10 }">{{ seat.poisonEnabled ? seat.poison : 'off' }}</span>
            <button class="counter-btn" @click="seat.poisonEnabled ? emit('changePoison', 1) : emit('togglePoison')">{{ seat.poisonEnabled ? '+' : 'on' }}</button>
          </div>
        </div>
        <div class="counter-item">
          <i class="ms ms-commander counter-icon tax-icon"></i>
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
              <div class="cmd-seat-dmg" :class="{ 'has-dmg': dmgFrom(si) > 0, lethal: cmd1From(si) >= 21 || cmd2From(si) >= 21 }">
                {{ hasPartners(si) ? cmd1From(si) + ' / ' + cmd2From(si) : cmd1From(si) }}
              </div>
              <!-- Progress bar(s) -->
              <div class="cmd-bars">
                <div class="cmd-bar-wrap">
                  <div class="cmd-bar" :class="{ danger: cmd1From(si) >= 16 }" :style="{ width: Math.min(cmd1From(si) / 21 * 100, 100) + '%' }"></div>
                </div>
                <div v-if="hasPartners(si)" class="cmd-bar-wrap">
                  <div class="cmd-bar" :class="{ danger: cmd2From(si) >= 16 }" :style="{ width: Math.min(cmd2From(si) / 21 * 100, 100) + '%' }"></div>
                </div>
              </div>
              <!-- Partner toggle -->
              <button class="partner-toggle" @pointerdown.stop @click.stop="emit('togglePartners', seat.index, si)">
                {{ hasPartners(si) ? '2 cmdrs' : '1 cmdr' }}
              </button>
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
  background: #1a1612ee;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.cmd-panel {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 14px;
  padding: 24px;
  width: 80vw;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cmd-title {
  text-align: center;
  font-size: 1.1rem;
  color: #c9a54e;
}

/* Counters row */
.counters-row {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.counter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a1612;
  border: 1px solid #3d3529;
  border-radius: 8px;
  padding: 8px 12px;
}

.counter-icon {
  font-size: 1.2rem;
}

.poison-icon {
  color: #4ec88a;
}

.tax-icon {
  color: #e2c878;
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
  background: #231f1a;
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
  height: clamp(100px, 25vw, 180px);
  overflow: hidden;
  border-radius: 6px;
  touch-action: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1612;
}

.cmd-seat-grad {
  position: absolute;
  inset: 0;
  opacity: 0.3;
}

.cmd-self {
  opacity: 0.35;
  cursor: default;
}

.cmd-seat-flash {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  transition: background-color 0.15s;
  z-index: 1;
}

.cmd-flash-left {
  left: 0;
}

.cmd-flash-right {
  right: 0;
}

.cmd-flash-left.flash {
  background: #d9555522;
}

.cmd-flash-right.flash {
  background: #6ab86a22;
}

.cmd-seat-content {
  position: relative;
  z-index: 2;
  text-align: center;
  pointer-events: none;
  width: 80%;
}

.cmd-seat-name {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.7rem, 2.2vw, 1rem);
  color: #d4c8a888;
  margin-bottom: 4px;
}

.cmd-seat-dmg {
  font-family: 'Cinzel', serif;
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 700;
  color: #d4c8a844;
  line-height: 1.1;
}

.cmd-seat-dmg.has-dmg {
  color: #d4c8a8;
}

.cmd-seat-dmg.lethal {
  color: #d95555;
}

/* Progress bars */
.cmd-bars {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.cmd-bar-wrap {
  height: 4px;
  background: #3d352944;
  border-radius: 2px;
  overflow: hidden;
}

.cmd-bar {
  height: 100%;
  background: #c9a54e;
  border-radius: 2px;
  transition: width 0.3s;
}

.cmd-bar.danger {
  background: #d95555;
}

.partner-toggle {
  position: relative;
  z-index: 3;
  pointer-events: auto;
  font-family: 'EB Garamond', serif;
  font-size: clamp(0.55rem, 1.3vw, 0.7rem);
  padding: 2px 8px;
  margin-top: 2px;
  border-radius: 4px;
  border: 1px solid #3d352966;
  background: #1a161288;
  color: #8a7e6688;
  cursor: pointer;
  transition: all 0.2s;
}

.partner-toggle:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}
</style>
