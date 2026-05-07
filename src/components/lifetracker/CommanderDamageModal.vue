<script setup>
import { ref, onUnmounted } from 'vue'
import { useLifeCounter } from '../../composables/useLifeCounter.js'
import { manaGradient } from '../../composables/useManaGradient.js'
import { roleIconUrl, lifetrackerRoleLabel, conversionIconUrl } from '../../roles.js'

const props = defineProps({
  seat: Object,
  allSeats: Array,
  layoutRows: Array,
  rotated: Boolean,
})

const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
  'Clone Lord': '#5ba3d9',
}

const emit = defineEmits(['change', 'togglePartners', 'changePoison', 'changeTax', 'revealRole', 'toggleDead', 'close'])

const activeSeat = ref(null)
const activeCmd = ref(1)
const flashSide = ref(null)
let flashTimeout = null
const counterEls = ref({})

// Poison counter interaction
const poisonEl = ref(null)
const poisonFlash = ref(null)
let poisonFlashTimeout = null
const poisonCounter = useLifeCounter((delta) => { emit('changePoison', delta) })

function poisonDown(event) {
  if (!poisonEl.value) return
  const sign = poisonCounter.getSign(event, poisonEl.value, props.rotated)
  poisonFlash.value = sign < 0 ? 'left' : 'right'
  clearTimeout(poisonFlashTimeout)
  poisonFlashTimeout = setTimeout(() => { poisonFlash.value = null }, 150)
  poisonCounter.start(sign)
}
function poisonUp() { poisonCounter.stop() }

// Tax counter interaction
const taxEl = ref(null)
const taxFlash = ref(null)
let taxFlashTimeout = null
const taxCounter = useLifeCounter((delta) => { emit('changeTax', delta) })

function taxDown(event) {
  if (!taxEl.value) return
  const sign = taxCounter.getSign(event, taxEl.value, props.rotated)
  taxFlash.value = sign < 0 ? 'left' : 'right'
  clearTimeout(taxFlashTimeout)
  taxFlashTimeout = setTimeout(() => { taxFlash.value = null }, 150)
  taxCounter.start(sign)
}
function taxUp() { taxCounter.stop() }

function setCounterEl(key, el) {
  if (el) counterEls.value[key] = el
}

const { start, stop, getSign } = useLifeCounter((delta) => {
  if (activeSeat.value !== null) {
    emit('change', props.seat.index, activeSeat.value, activeCmd.value, delta)
  }
})

function handleDown(event, si, cmdIdx) {
  const key = cmdIdx ? `${si}-${cmdIdx}` : String(si)
  const el = counterEls.value[key]
  if (!el) return
  activeSeat.value = si
  activeCmd.value = cmdIdx || 1
  const sign = getSign(event, el, props.rotated)
  // Reversed: left = plus (receiving damage), right = minus (correcting)
  flashSide.value = { key, side: sign < 0 ? 'left' : 'right' }
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

function cmd1From(si) {
  return props.seat.commanderDamage[si]?.cmd1 || 0
}

function cmd2From(si) {
  return props.seat.commanderDamage[si]?.cmd2 || 0
}

function hasPartners(si) {
  return props.seat.commanderDamage[si]?.hasPartners || false
}

function isFlash(key, side) {
  return flashSide.value && flashSide.value.key === key && flashSide.value.side === side
}

const closing = ref(false)

function handleClose() {
  closing.value = true
  stop()
  poisonCounter.stop()
  taxCounter.stop()
  setTimeout(() => emit('close'), 300)
}

onUnmounted(() => {
  stop()
  poisonCounter.stop()
  taxCounter.stop()
  clearTimeout(flashTimeout)
  clearTimeout(poisonFlashTimeout)
  clearTimeout(taxFlashTimeout)
})
</script>

<template>
  <div class="cmd-overlay" :class="{ closing }" @click.self="!closing && handleClose()">
    <div class="cmd-panel" :class="{ closing }" :style="{ transform: rotated ? 'rotate(180deg)' : undefined }" @click.stop>
      <!-- Counters row -->
      <div class="counters-row">
        <!-- Reveal role button -->
        <button class="counter-box role-box" @click="emit('revealRole')">
          <div class="counter-center">
            <template v-if="seat.role && seat.roleRevealed">
              <img :src="roleIconUrl(seat.role)" alt="" class="role-box-img" />
              <span class="reveal-label active role-box-label" :style="{ color: ROLE_COLORS[seat.role] }">
                <span v-for="word in lifetrackerRoleLabel(seat.role).split(' ')" :key="word">{{ word }}</span>
              </span>
            </template>
            <template v-else>
              <i class="ms ms-ability-cloak counter-icon role-icon"></i>
              <span class="reveal-label">Role</span>
            </template>
          </div>
        </button>
        <!-- Death toggle -->
        <button class="counter-box reveal-role-box" :class="{ 'death-active': seat.isDead }" @click="emit('toggleDead')">
          <div class="counter-center">
            <i :class="seat.isDead ? 'ms ms-graveyard' : 'ms ms-ability-lifelink'" class="counter-icon death-icon"></i>
            <span class="reveal-label" :class="{ active: seat.isDead }">{{ seat.isDead ? 'Dead' : 'Alive' }}</span>
          </div>
        </button>
        <div
          ref="taxEl"
          class="counter-box"
          @contextmenu.prevent
          @pointerdown.prevent="taxDown"
          @pointerup.prevent="taxUp"
          @pointercancel="taxUp"
          @pointerleave="taxUp"
        >
          <div class="counter-flash counter-flash-left" :class="{ flash: taxFlash === 'left' }"></div>
          <div class="counter-flash counter-flash-right" :class="{ flash: taxFlash === 'right' }"></div>
          <div class="counter-center">
            <i class="ms ms-commander counter-icon tax-icon"></i>
            <span class="counter-val" :class="{ active: seat.commanderTax > 0 }">{{ seat.commanderTax }}</span>
          </div>
          <span class="counter-hint counter-hint-left">&minus;</span>
          <span class="counter-hint counter-hint-right">+</span>
        </div>
        <div
          ref="poisonEl"
          class="counter-box"
          @contextmenu.prevent
          @pointerdown.prevent="poisonDown"
          @pointerup.prevent="poisonUp"
          @pointercancel="poisonUp"
          @pointerleave="poisonUp"
        >
          <div class="counter-flash counter-flash-left" :class="{ flash: poisonFlash === 'left' }"></div>
          <div class="counter-flash counter-flash-right" :class="{ flash: poisonFlash === 'right' }"></div>
          <div class="counter-center">
            <i class="ms ms-ability-phyrexian counter-icon poison-icon"></i>
            <span class="counter-val" :class="{ active: seat.poison > 0, lethal: seat.poison >= 10 }">{{ seat.poison }}</span>
          </div>
          <span class="counter-hint counter-hint-left">&minus;</span>
          <span class="counter-hint counter-hint-right">+</span>
        </div>
      </div>

      <!-- Enlarged table layout -->
      <div class="cmd-layout">
        <div v-for="(row, ri) in (rotated ? [...layoutRows].reverse() : layoutRows)" :key="ri" class="cmd-row">
          <!-- Single commander seat -->
          <template v-for="si in (rotated ? [...row.seats].reverse() : row.seats)" :key="si">
            <div v-if="!hasPartners(si)" class="cmd-seat" :class="{ 'cmd-self': si === seat.index }">
              <div class="cmd-seat-grad" :style="seatGradStyle(si)"></div>
              <div
                v-if="(allSeats[si]?.role && allSeats[si]?.roleRevealed) || conversionIconUrl(allSeats[si]?.roleNotes)"
                class="cmd-seat-icons"
              >
                <img
                  v-if="allSeats[si]?.role && allSeats[si]?.roleRevealed"
                  :src="roleIconUrl(allSeats[si].role)"
                  alt=""
                  class="cmd-seat-role"
                />
                <img
                  v-if="conversionIconUrl(allSeats[si]?.roleNotes)"
                  :src="conversionIconUrl(allSeats[si].roleNotes)"
                  alt=""
                  class="cmd-seat-role cmd-seat-role-conversion"
                />
              </div>
              <!-- Tap zone -->
              <div
                :ref="(el) => setCounterEl(String(si), el)"
                class="cmd-tap-zone"
                @contextmenu.prevent
                @pointerdown.prevent="handleDown($event, si)"
                @pointerup.prevent="handleUp"
                @pointercancel="handleUp"
                @pointerleave="handleUp"
              >
                <div class="cmd-flash-half cmd-flash-minus" :class="{ flash: isFlash(String(si), 'left') }">
                  <span class="zone-hint">&minus;</span>
                </div>
                <div class="cmd-flash-half cmd-flash-plus" :class="{ flash: isFlash(String(si), 'right') }">
                  <span class="zone-hint">+</span>
                </div>
              </div>
              <div class="cmd-seat-name-top" :class="{ 'has-dmg': cmd1From(si) > 0 }">{{ allSeats[si]?.player }}</div>
              <div class="cmd-seat-content">
                <div class="cmd-seat-dmg" :class="{ 'has-dmg': cmd1From(si) > 0, lethal: cmd1From(si) >= 21 }">{{ cmd1From(si) }}</div>
              </div>
              <!-- Progress bar -->
              <div class="cmd-bar-bottom">
                <div class="cmd-bar" :class="{ danger: cmd1From(si) >= 16 }" :style="{ width: Math.min(cmd1From(si) / 21 * 100, 100) + '%' }"></div>
              </div>
              <!-- Partner toggle -->
              <button class="partner-toggle" @pointerdown.stop @click.stop="emit('togglePartners', seat.index, si)">
                <i class="ms ms-commander"></i>
              </button>
            </div>

            <!-- Dual commander seat (split in half) -->
            <div v-else class="cmd-seat cmd-seat-split" :class="{ 'cmd-self': si === seat.index }">
              <div class="cmd-seat-grad" :style="seatGradStyle(si)"></div>
              <div
                v-if="(allSeats[si]?.role && allSeats[si]?.roleRevealed) || conversionIconUrl(allSeats[si]?.roleNotes)"
                class="cmd-seat-icons"
              >
                <img
                  v-if="allSeats[si]?.role && allSeats[si]?.roleRevealed"
                  :src="roleIconUrl(allSeats[si].role)"
                  alt=""
                  class="cmd-seat-role"
                />
                <img
                  v-if="conversionIconUrl(allSeats[si]?.roleNotes)"
                  :src="conversionIconUrl(allSeats[si].roleNotes)"
                  alt=""
                  class="cmd-seat-role cmd-seat-role-conversion"
                />
              </div>
              <!-- Commander 1 (left half) -->
              <div
                :ref="(el) => setCounterEl(`${si}-1`, el)"
                class="cmd-split-half"
                @contextmenu.prevent
                @pointerdown.prevent="handleDown($event, si, 1)"
                @pointerup.prevent="handleUp"
                @pointercancel="handleUp"
                @pointerleave="handleUp"
              >
                <div class="cmd-flash-half cmd-flash-minus" :class="{ flash: isFlash(`${si}-1`, 'left') }">
                  <span class="zone-hint">&minus;</span>
                </div>
                <div class="cmd-flash-half cmd-flash-plus" :class="{ flash: isFlash(`${si}-1`, 'right') }">
                  <span class="zone-hint">+</span>
                </div>
                <div class="cmd-split-content">
                  <div class="cmd-seat-dmg cmd-split-dmg" :class="{ 'has-dmg': cmd1From(si) > 0, lethal: cmd1From(si) >= 21 }">{{ cmd1From(si) }}</div>
                </div>
                <div class="cmd-bar-bottom">
                  <div class="cmd-bar" :class="{ danger: cmd1From(si) >= 16 }" :style="{ width: Math.min(cmd1From(si) / 21 * 100, 100) + '%' }"></div>
                </div>
              </div>
              <div class="cmd-split-divider"></div>
              <!-- Commander 2 (right half) -->
              <div
                :ref="(el) => setCounterEl(`${si}-2`, el)"
                class="cmd-split-half"
                @contextmenu.prevent
                @pointerdown.prevent="handleDown($event, si, 2)"
                @pointerup.prevent="handleUp"
                @pointercancel="handleUp"
                @pointerleave="handleUp"
              >
                <div class="cmd-flash-half cmd-flash-minus" :class="{ flash: isFlash(`${si}-2`, 'left') }">
                  <span class="zone-hint">&minus;</span>
                </div>
                <div class="cmd-flash-half cmd-flash-plus" :class="{ flash: isFlash(`${si}-2`, 'right') }">
                  <span class="zone-hint">+</span>
                </div>
                <div class="cmd-split-content">
                  <div class="cmd-seat-dmg cmd-split-dmg" :class="{ 'has-dmg': cmd2From(si) > 0, lethal: cmd2From(si) >= 21 }">{{ cmd2From(si) }}</div>
                </div>
                <div class="cmd-bar-bottom">
                  <div class="cmd-bar" :class="{ danger: cmd2From(si) >= 16 }" :style="{ width: Math.min(cmd2From(si) / 21 * 100, 100) + '%' }"></div>
                </div>
              </div>
              <!-- Player name spans both -->
              <div class="cmd-split-name">{{ allSeats[si]?.player }}</div>
              <!-- Partner toggle -->
              <button class="partner-toggle" @pointerdown.stop @click.stop="emit('togglePartners', seat.index, si)">
                <i class="ms ms-commander"></i><i class="ms ms-commander"></i>
              </button>
            </div>
          </template>
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
  transition: opacity 0.3s;
}

.cmd-overlay.closing {
  opacity: 0;
  pointer-events: none;
}

.cmd-panel {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 3px;
  padding: 24px;
  width: 92vw;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Counters row */
.counters-row {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.role-box {
  cursor: pointer;
  border-color: #c9a54e44;
}

.role-box:hover {
  border-color: #c9a54e;
}

.reveal-role-box {
  cursor: pointer;
}

.death-active {
  border-color: #d95555;
}

.reveal-role-box:hover {
  border-color: #8a7e66;
}

.reveal-label {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 700;
  color: #8a7e6644;
  white-space: nowrap;
}

.reveal-label.active {
  color: #d4c8a8;
}

.reveal-icon-ms {
  font-size: 2.5rem;
  color: #d4c8a8;
}

.reveal-icon {
  font-size: 2rem;
  pointer-events: none;
}

.counter-box {
  flex: 0 0 auto;
  width: 130px;
  height: clamp(100px, 22vw, 160px);
  background: #1a1612;
  border: 1px solid #3d3529;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
  cursor: pointer;
}

.counter-flash {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.counter-hint {
  position: absolute;
  bottom: 30%;
  font-family: 'Cinzel', serif;
  font-size: 1.3rem;
  color: #8a7e6633;
  pointer-events: none;
  z-index: 2;
}

.counter-hint-left {
  left: 12%;
}

.counter-hint-right {
  right: 12%;
}

.counter-flash-left {
  left: 0;
}

.counter-flash-right {
  right: 0;
}

.counter-flash-left.flash {
  background: #6ab86a22;
}

.counter-flash-right.flash {
  background: #d9555522;
}

.counter-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  pointer-events: none;
  z-index: 1;
}

.counter-icon {
  font-size: 4rem;
}

.role-box-img {
  width: clamp(48px, 9vw, 80px);
  height: clamp(48px, 9vw, 80px);
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.role-box-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-align: center;
}

.poison-icon,
.tax-icon,
.death-icon,
.role-icon {
  color: #d4c8a8;
}

.counter-val {
  font-family: 'Cinzel', serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #8a7e6644;
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
  border-radius: 3px;
  overflow: hidden;
  background: #0d0b09;
  border: 3px solid #0d0b09;
}

.cmd-row {
  display: flex;
  gap: 3px;
}

.cmd-seat {
  flex: 1;
  position: relative;
  height: clamp(120px, 30vw, 220px);
  overflow: hidden;
  border-radius: 3px;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
  background: #1a1612;
}

.cmd-seat-grad {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  pointer-events: none;
}

.cmd-self {
  border: 2px solid #d9555566;
}

.cmd-seat-icons {
  position: absolute;
  top: clamp(20px, 4vw, 28px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  z-index: 4;
}

.cmd-seat-role {
  width: clamp(22px, 4.5vw, 36px);
  height: clamp(22px, 4.5vw, 36px);
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.cmd-seat-role-conversion {
  width: clamp(18px, 3.6vw, 28px);
  height: clamp(18px, 3.6vw, 28px);
}

/* Single commander tap zone */
.cmd-tap-zone {
  position: absolute;
  inset: 0;
  display: flex;
  cursor: pointer;
  z-index: 1;
}

.cmd-flash-half {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.cmd-flash-minus {
  justify-content: center;
  padding-right: 10%;
}

.cmd-flash-plus {
  justify-content: center;
  padding-left: 10%;
}

/* Plus = red (receiving damage), minus = green (correcting) */
.cmd-flash-minus.flash {
  background: #6ab86a22;
}

.cmd-flash-plus.flash {
  background: #d9555522;
}

.zone-hint {
  font-family: 'Cinzel', serif;
  font-size: clamp(1.2rem, 4vw, 2rem);
  color: #8a7e6633;
  pointer-events: none;
}

.cmd-flash-half:active .zone-hint,
.cmd-flash-half.flash .zone-hint {
  color: #8a7e6666;
}

.cmd-seat-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
}

.cmd-seat-name-top {
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.7rem, 2.2vw, 1rem);
  color: #8a7e66;
}

.cmd-seat-name-top.has-dmg {
  color: #d4c8a8;
  pointer-events: none;
  z-index: 3;
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

/* Progress bar at bottom */
.cmd-bar-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: #3d352944;
  z-index: 3;
}

.cmd-bar {
  height: 100%;
  background: #c9a54e;
  transition: width 0.3s;
}

.cmd-bar.danger {
  background: #d95555;
}

/* Partner toggle */
.partner-toggle {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 4;
  pointer-events: auto;
  font-size: 0.7rem;
  padding: 4px 6px;
  border-radius: 3px;
  border: 1px solid #3d352966;
  background: #1a161288;
  color: #8a7e6688;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 2px;
}

.partner-toggle:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}

/* Dual commander split seat */
.cmd-seat-split {
  display: flex;
  flex-direction: column;
}

.cmd-split-half {
  flex: 1;
  position: relative;
  display: flex;
  cursor: pointer;
  touch-action: none;
  z-index: 1;
}

.cmd-split-divider {
  height: 2px;
  background: #3d352966;
  z-index: 2;
}

.cmd-split-content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
}

.cmd-split-dmg {
  font-size: clamp(1.5rem, 4.5vw, 2.5rem);
}

.cmd-split-name {
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.6rem, 1.8vw, 0.85rem);
  color: #d4c8a888;
  pointer-events: none;
  z-index: 3;
}
</style>
