<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useLifeCounter } from '../../composables/useLifeCounter.js'
import { colorIcons } from '../../mana.js'

const props = defineProps({
  seat: Object,
  fromSeat: Object,
  fromIndex: Number,
})

const emit = defineEmits(['change', 'togglePartners', 'changePoison', 'togglePoison', 'changeTax', 'close'])

const dmg = computed(() => props.seat.commanderDamage[props.fromIndex] || { cmd1: 0, cmd2: 0, hasPartners: false })
const activeCmd = ref(1)

const { start, stop, getSign } = useLifeCounter((delta) => {
  emit('change', props.seat.index, props.fromIndex, activeCmd.value, delta)
})

const counterEl = ref(null)
const flashSide = ref(null)
let flashTimeout = null

function handleDown(event) {
  if (!counterEl.value) return
  const sign = getSign(event, counterEl.value, false)
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
})

const fromMana = computed(() => colorIcons(props.fromSeat?.deck?.colors || ''))
const currentDmg = computed(() => activeCmd.value === 2 ? dmg.value.cmd2 : dmg.value.cmd1)
const totalDmg = computed(() => dmg.value.cmd1 + dmg.value.cmd2)
</script>

<template>
  <div class="cmd-overlay" @click.self="emit('close')">
    <div class="cmd-panel">
      <!-- From player info -->
      <div class="cmd-from">
        <span class="cmd-from-name font-beleren">{{ fromSeat?.player }}</span>
        <span v-if="fromSeat?.deck" class="cmd-from-deck">
          {{ fromSeat.deck.name }}
          <span v-if="fromMana.length" class="cmd-from-mana">
            <i v-for="c in fromMana" :key="c.label" :class="[c.icon, 'ms-cost']"></i>
          </span>
        </span>
      </div>

      <!-- Partner tab switcher -->
      <div v-if="dmg.hasPartners" class="cmd-tabs">
        <button class="cmd-tab" :class="{ active: activeCmd === 1 }" @click="activeCmd = 1">Cmdr 1</button>
        <button class="cmd-tab" :class="{ active: activeCmd === 2 }" @click="activeCmd = 2">Cmdr 2</button>
      </div>

      <!-- Damage counter with tap zones -->
      <div
        ref="counterEl"
        class="cmd-counter"
        @pointerdown.prevent="handleDown"
        @pointerup.prevent="handleUp"
        @pointercancel="handleUp"
        @pointerleave="handleUp"
      >
        <div class="cmd-zone cmd-zone-minus" :class="{ flash: flashSide === 'left' }">
          <span class="cmd-zone-label">&minus;</span>
        </div>
        <div class="cmd-total" :class="{ lethal: currentDmg >= 21 }">{{ currentDmg }}</div>
        <div class="cmd-zone cmd-zone-plus" :class="{ flash: flashSide === 'right' }">
          <span class="cmd-zone-label">+</span>
        </div>
      </div>

      <!-- Progress -->
      <div class="cmd-progress">
        <div class="cmd-bar-wrap">
          <div class="cmd-bar" :class="{ danger: totalDmg >= 16 }" :style="{ width: Math.min(totalDmg / 21 * 100, 100) + '%' }"></div>
        </div>
        <span class="cmd-sum">{{ totalDmg }}/21</span>
      </div>

      <!-- Partner toggle -->
      <button class="partner-btn" @click="emit('togglePartners', seat.index, fromIndex)">
        {{ dmg.hasPartners ? 'Single Commander' : 'Partner Commanders' }}
      </button>

      <!-- Divider -->
      <div class="cmd-divider"></div>

      <!-- Poison -->
      <div class="counter-row">
        <span class="counter-label">&#x2620; Poison</span>
        <div class="counter-controls">
          <button class="counter-btn" @click="emit('changePoison', -1)" :disabled="!seat.poisonEnabled || seat.poison <= 0">&minus;</button>
          <span class="counter-val" :class="{ 'counter-active': seat.poisonEnabled && seat.poison > 0 }">{{ seat.poisonEnabled ? seat.poison : 'off' }}</span>
          <button class="counter-btn" @click="seat.poisonEnabled ? emit('changePoison', 1) : emit('togglePoison')">{{ seat.poisonEnabled ? '+' : 'on' }}</button>
        </div>
      </div>

      <!-- Commander Tax -->
      <div class="counter-row">
        <span class="counter-label">Tax</span>
        <div class="counter-controls">
          <button class="counter-btn" @click="emit('changeTax', -1)" :disabled="seat.commanderTax <= 0">&minus;</button>
          <span class="counter-val" :class="{ 'counter-active': seat.commanderTax > 0 }">{{ seat.commanderTax }}</span>
          <button class="counter-btn" @click="emit('changeTax', 1)">+</button>
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
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 12px;
  padding: 20px;
  width: 75%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.cmd-from {
  text-align: center;
}

.cmd-from-name {
  font-size: 1.1rem;
  color: #d4c8a8;
  display: block;
}

.cmd-from-deck {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  color: #8a7e66;
  font-style: italic;
}

.cmd-from-mana {
  display: inline-flex;
  gap: 2px;
  margin-left: 4px;
  font-size: 0.7rem;
}

.cmd-tabs {
  display: flex;
  gap: 4px;
}

.cmd-tab {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid #3d3529;
  background: #1a1612;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
}

.cmd-tab.active {
  border-color: #c9a54e66;
  background: #c9a54e11;
  color: #c9a54e;
}

.cmd-counter {
  position: relative;
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  border-radius: 10px;
  overflow: hidden;
  background: #1a161288;
  border: 1px solid #3d352966;
  touch-action: none;
  cursor: pointer;
}

.cmd-zone {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  transition: background-color 0.15s;
}

.cmd-zone-minus {
  justify-content: center;
  padding-right: 10%;
}

.cmd-zone-plus {
  justify-content: center;
  padding-left: 10%;
}

.cmd-zone-label {
  font-family: 'Cinzel', serif;
  font-size: 1.8rem;
  color: #8a7e6618;
  pointer-events: none;
  transition: color 0.15s;
}

.cmd-zone:active .cmd-zone-label,
.flash .cmd-zone-label {
  color: #8a7e6633;
}

.flash.cmd-zone-minus {
  background: #d9555511;
}

.flash.cmd-zone-plus {
  background: #6ab86a11;
}

.cmd-total {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cinzel', serif;
  font-size: 3rem;
  font-weight: 700;
  color: #d4c8a8;
  pointer-events: none;
  z-index: 1;
}

.cmd-total.lethal {
  color: #d95555;
}

.cmd-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.cmd-bar-wrap {
  flex: 1;
  height: 6px;
  background: #3d352944;
  border-radius: 3px;
  overflow: hidden;
}

.cmd-bar {
  height: 100%;
  background: #c9a54e;
  border-radius: 3px;
  transition: width 0.3s;
}

.cmd-bar.danger {
  background: #d95555;
}

.cmd-sum {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  color: #8a7e66;
  min-width: 40px;
  text-align: right;
}

.partner-btn {
  font-family: 'EB Garamond', serif;
  font-size: 0.9rem;
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid #3d352966;
  background: none;
  color: #8a7e66;
  cursor: pointer;
  transition: all 0.2s;
}

.partner-btn:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}

.cmd-divider {
  width: 100%;
  height: 1px;
  background: #3d352944;
}

.counter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.counter-label {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  color: #8a7e66;
}

.counter-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.counter-btn {
  width: 44px;
  height: 44px;
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
  font-size: 1.1rem;
  color: #8a7e66;
  min-width: 32px;
  text-align: center;
}

.counter-active {
  color: #d4c8a8;
}
</style>
