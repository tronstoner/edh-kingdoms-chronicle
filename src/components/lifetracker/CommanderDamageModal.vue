<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { useLifeCounter } from '../../composables/useLifeCounter.js'
import { manaGradient } from '../../composables/useManaGradient.js'
import { roleIconUrl, lifetrackerRoleLabel, conversionIconUrl } from '../../roles.js'
import { HOUSE_COLORS, houseImageUrl } from '../../lifetracker/cycle.js'

const props = defineProps({
  seat: Object,
  allSeats: Array,
  layoutRows: Array,
  rotated: Boolean,
  mode: { type: String, default: 'kingdoms' },
})

// Role label colours — themed CSS vars so the bright theme picks up the
// brighter palette automatically. See :root in style.css.
const ROLE_COLORS = {
  King: 'var(--lt-role-king)',
  Knight: 'var(--lt-role-knight)',
  Goblin: 'var(--lt-role-goblin)',
  Lord: 'var(--lt-role-lord)',
  'Zombie Lord': 'var(--lt-role-lord)',
  'Clone Lord': 'var(--lt-role-clone-lord)',
}

const emit = defineEmits(['commit', 'togglePartners', 'revealRole', 'close'])

// Working copy. The modal is a staging area — nothing is applied to the
// live game state until it closes, at which point `commit` hands the final
// values to the parent and the state layer resolves once. Editing live
// would fire death / Kingdoms cascades on every intermediate keystroke, so
// an over-shot entry could no longer be freely undone with the − button.
const work = reactive({
  commanderDamage: {},
  commanderTax: props.seat.commanderTax || 0,
  poison: props.seat.poison || 0,
  isDead: !!props.seat.isDead,
  deathOverridden: !!props.seat.deathOverridden,
})
// Snapshot of the values as the modal opened, so the seat can show the net
// delta entered this session (e.g. "+5") alongside the running total.
const orig = {}
for (const [k, v] of Object.entries(props.seat.commanderDamage || {})) {
  work.commanderDamage[k] = { cmd1: v.cmd1 || 0, cmd2: v.cmd2 || 0 }
  orig[k] = { cmd1: v.cmd1 || 0, cmd2: v.cmd2 || 0 }
}

const activeSeat = ref(null)
const activeCmd = ref(1)
// Which seat/commander is mid-flash, and in which direction (+1 damage vs
// −1 correction) so the overlay can tint accordingly.
const flashState = ref(null)
let flashTimeout = null

// Poison counter interaction
const poisonEl = ref(null)
const poisonFlash = ref(null)
let poisonFlashTimeout = null
const poisonCounter = useLifeCounter((delta) => { work.poison = Math.max(0, work.poison + delta) })

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
const taxCounter = useLifeCounter((delta) => { work.commanderTax = Math.max(0, work.commanderTax + delta) })

function taxDown(event) {
  if (!taxEl.value) return
  const sign = taxCounter.getSign(event, taxEl.value, props.rotated)
  taxFlash.value = sign < 0 ? 'left' : 'right'
  clearTimeout(taxFlashTimeout)
  taxFlashTimeout = setTimeout(() => { taxFlash.value = null }, 150)
  taxCounter.start(sign)
}
function taxUp() { taxCounter.stop() }

// Which dealer/commander values the user has touched this session. Drives
// the − button's visibility: it appears only after an interaction and then
// stays — including at 0 — so the spot under the finger keeps decrementing
// instead of collapsing back to the increment zone (which would toggle
// inc/dec on repeated taps). Resets when the modal remounts on close.
const touched = reactive({})

const { start, stop } = useLifeCounter((delta) => {
  if (activeSeat.value === null) return
  const d = work.commanderDamage[activeSeat.value]
  if (!d) return
  const key = activeCmd.value === 2 ? 'cmd2' : 'cmd1'
  d[key] = Math.max(0, d[key] + delta)
  touched[`${activeSeat.value}-${activeCmd.value}`] = true
})

function isTouched(si, cmd) {
  return !!touched[`${si}-${cmd}`]
}

// Death is staged too — toggling mirrors the revive-as-override /
// manual-kill semantics the state layer applies on commit.
function toggleDead() {
  if (work.isDead) {
    work.isDead = false
    work.deathOverridden = true
  } else {
    work.isDead = true
    work.deathOverridden = false
  }
}

// Single-action model: a press anywhere on a dealer seat adds damage
// (sign +1), a press on the small corner button corrects it (sign −1).
// Hold repeats in the given direction. No left/right split — that
// ambiguity was the source of the wrong-button confusion.
function handleDown(si, cmdIdx, sign) {
  const key = cmdIdx ? `${si}-${cmdIdx}` : String(si)
  activeSeat.value = si
  activeCmd.value = cmdIdx || 1
  flashState.value = { key, sign }
  clearTimeout(flashTimeout)
  flashTimeout = setTimeout(() => { flashState.value = null }, 150)
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
  return work.commanderDamage[si]?.cmd1 || 0
}

function cmd2From(si) {
  return work.commanderDamage[si]?.cmd2 || 0
}

// Net change entered this session, relative to the snapshot on open.
function cmd1Delta(si) {
  return cmd1From(si) - (orig[si]?.cmd1 || 0)
}

function cmd2Delta(si) {
  return cmd2From(si) - (orig[si]?.cmd2 || 0)
}

function fmtDelta(d) {
  return d > 0 ? `+${d}` : `${d}`
}

function hasPartners(si) {
  return props.allSeats[si]?.hasPartners || false
}

function hasIcons(si) {
  const s = props.allSeats[si]
  if (!s) return false
  if (props.mode === 'cycle') return !!s.house
  return (s.role && s.roleRevealed) || !!conversionIconUrl(s.roleNotes)
}

function isFlash(key) {
  return !!flashState.value && flashState.value.key === key
}

function isFlashMinus(key) {
  return isFlash(key) && flashState.value.sign < 0
}

function isSelf(si) {
  return si === props.seat.index
}

const closing = ref(false)

// Closing the modal *is* the confirmation: flush any in-flight press into
// the working copy, then hand the final values to the parent as one atomic
// commit so the state layer resolves exactly once.
function handleClose() {
  if (closing.value) return
  closing.value = true
  stop()
  poisonCounter.stop()
  taxCounter.stop()
  const commanderDamage = {}
  for (const k of Object.keys(work.commanderDamage)) {
    commanderDamage[k] = { cmd1: work.commanderDamage[k].cmd1, cmd2: work.commanderDamage[k].cmd2 }
  }
  emit('commit', {
    commanderDamage,
    commanderTax: work.commanderTax,
    poison: work.poison,
    isDead: work.isDead,
    deathOverridden: work.deathOverridden,
  })
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
      <button class="lt-modal-close" @click="!closing && handleClose()" aria-label="Close">×</button>
      <!-- Counters row -->
      <div class="counters-row">
        <!-- Identity: role (Kingdoms, interactive) or House (Cycle, static) -->
        <button
          v-if="mode !== 'cycle'"
          class="counter-box role-box"
          @click="emit('revealRole')"
        >
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
        <div v-else class="counter-box role-box" style="cursor: default;">
          <div class="counter-center">
            <img v-if="seat.house" :src="houseImageUrl(seat.house)" alt="" class="role-box-img" />
            <span v-if="seat.house" class="reveal-label active role-box-label" :style="{ color: HOUSE_COLORS[seat.house] }">{{ seat.house }}</span>
          </div>
        </div>
        <!-- Death toggle -->
        <button class="counter-box reveal-role-box" :class="{ 'death-active': work.isDead }" @click="toggleDead()">
          <div class="counter-center">
            <i :class="work.isDead ? 'ms ms-graveyard' : 'ms ms-ability-lifelink'" class="counter-icon death-icon"></i>
            <span class="reveal-label" :class="{ active: work.isDead }">{{ work.isDead ? 'Dead' : 'Alive' }}</span>
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
            <span class="counter-val" :class="{ active: work.commanderTax > 0 }">{{ work.commanderTax }}</span>
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
            <span class="counter-val" :class="{ active: work.poison > 0, lethal: work.poison >= 10 }">{{ work.poison }}</span>
          </div>
          <span class="counter-hint counter-hint-left">&minus;</span>
          <span class="counter-hint counter-hint-right">+</span>
        </div>
      </div>

      <!-- Framing line: this modal is scoped to one victim; every seat
           below is a potential dealer. Spelling that out removes the
           "which direction / whose damage" ambiguity. -->
      <p class="cmd-header">
        <span class="cmd-header-name">{{ seat.player }}</span> takes commander damage from
      </p>

      <!-- Enlarged table layout -->
      <div class="cmd-layout">
        <div v-for="(row, ri) in (rotated ? [...layoutRows].reverse() : layoutRows)" :key="ri" class="cmd-row">
          <!-- Single commander seat -->
          <template v-for="si in (rotated ? [...row.seats].reverse() : row.seats)" :key="si">
            <div v-if="!hasPartners(si)" class="cmd-seat" :class="{ 'cmd-self': isSelf(si) }">
              <div class="cmd-seat-grad" :style="seatGradStyle(si)"></div>
              <div
                v-if="(mode === 'cycle' && allSeats[si]?.house) || (allSeats[si]?.role && allSeats[si]?.roleRevealed) || conversionIconUrl(allSeats[si]?.roleNotes)"
                class="cmd-seat-icons"
              >
                <img
                  v-if="mode === 'cycle' && allSeats[si]?.house"
                  :src="houseImageUrl(allSeats[si].house)"
                  :alt="allSeats[si].house"
                  class="cmd-seat-role cmd-seat-house"
                />
                <img
                  v-if="mode !== 'cycle' && allSeats[si]?.role && allSeats[si]?.roleRevealed"
                  :src="roleIconUrl(allSeats[si].role)"
                  alt=""
                  class="cmd-seat-role"
                />
                <img
                  v-if="mode !== 'cycle' && conversionIconUrl(allSeats[si]?.roleNotes)"
                  :src="conversionIconUrl(allSeats[si].roleNotes)"
                  alt=""
                  class="cmd-seat-role cmd-seat-role-conversion"
                />
              </div>
              <!-- Tap zone: a press anywhere = +1 damage, hold to repeat -->
              <div
                class="cmd-tap-zone"
                @contextmenu.prevent
                @pointerdown.prevent="handleDown(si, 0, 1)"
                @pointerup.prevent="handleUp"
                @pointercancel="handleUp"
                @pointerleave="handleUp"
              >
                <div class="cmd-flash-full" :class="{ flash: isFlash(String(si)), minus: isFlashMinus(String(si)) }"></div>
              </div>
              <div class="cmd-seat-name-top" :class="{ 'has-dmg': cmd1From(si) > 0 }">{{ allSeats[si]?.player }}</div>
              <div class="cmd-seat-content">
                <div class="cmd-num-wrap">
                  <div class="cmd-seat-dmg" :class="{ 'has-dmg': cmd1From(si) > 0, lethal: cmd1From(si) >= 21 }">{{ cmd1From(si) }}</div>
                  <div v-if="cmd1Delta(si) !== 0" class="cmd-delta" :class="{ neg: cmd1Delta(si) < 0 }">{{ fmtDelta(cmd1Delta(si)) }}</div>
                </div>
              </div>
              <!-- Progress bar -->
              <div class="cmd-bar-bottom">
                <div class="cmd-bar" :class="{ danger: cmd1From(si) >= 16 }" :style="{ width: Math.min(cmd1From(si) / 21 * 100, 100) + '%' }"></div>
              </div>
              <!-- Correction: de-emphasized −1 (hold to repeat). Shown only
                   after the user has touched this value this session, and
                   then it stays (even at 0) so the finger's spot keeps
                   decrementing rather than flipping back to increment. -->
              <button
                v-if="isTouched(si, 1)"
                class="cmd-minus"
                @contextmenu.prevent
                @pointerdown.stop.prevent="handleDown(si, 0, -1)"
                @pointerup.stop.prevent="handleUp"
                @pointercancel="handleUp"
                @pointerleave="handleUp"
              >&minus;</button>
              <!-- Partner toggle -->
              <button class="partner-toggle" @pointerdown.stop @click.stop="emit('togglePartners', seat.index, si)">
                <i class="ms ms-commander"></i>
              </button>
            </div>

            <!-- Dual commander seat (split in half) -->
            <div v-else class="cmd-seat cmd-seat-split" :class="{ 'cmd-self': isSelf(si), 'has-icons': hasIcons(si) }">
              <div class="cmd-seat-grad" :style="seatGradStyle(si)"></div>
              <div
                v-if="(mode === 'cycle' && allSeats[si]?.house) || (allSeats[si]?.role && allSeats[si]?.roleRevealed) || conversionIconUrl(allSeats[si]?.roleNotes)"
                class="cmd-seat-icons"
              >
                <img
                  v-if="mode === 'cycle' && allSeats[si]?.house"
                  :src="houseImageUrl(allSeats[si].house)"
                  :alt="allSeats[si].house"
                  class="cmd-seat-role cmd-seat-house"
                />
                <img
                  v-if="mode !== 'cycle' && allSeats[si]?.role && allSeats[si]?.roleRevealed"
                  :src="roleIconUrl(allSeats[si].role)"
                  alt=""
                  class="cmd-seat-role"
                />
                <img
                  v-if="mode !== 'cycle' && conversionIconUrl(allSeats[si]?.roleNotes)"
                  :src="conversionIconUrl(allSeats[si].roleNotes)"
                  alt=""
                  class="cmd-seat-role cmd-seat-role-conversion"
                />
              </div>
              <!-- Commander 1 (top half): press = +1, corner − = correct -->
              <div
                class="cmd-split-half"
                @contextmenu.prevent
                @pointerdown.prevent="handleDown(si, 1, 1)"
                @pointerup.prevent="handleUp"
                @pointercancel="handleUp"
                @pointerleave="handleUp"
              >
                <div class="cmd-flash-full" :class="{ flash: isFlash(`${si}-1`), minus: isFlashMinus(`${si}-1`) }"></div>
                <div class="cmd-split-content">
                  <div class="cmd-num-wrap">
                    <div class="cmd-seat-dmg cmd-split-dmg" :class="{ 'has-dmg': cmd1From(si) > 0, lethal: cmd1From(si) >= 21 }">{{ cmd1From(si) }}</div>
                    <div v-if="cmd1Delta(si) !== 0" class="cmd-delta cmd-delta-split" :class="{ neg: cmd1Delta(si) < 0 }">{{ fmtDelta(cmd1Delta(si)) }}</div>
                  </div>
                </div>
                <div class="cmd-bar-bottom">
                  <div class="cmd-bar" :class="{ danger: cmd1From(si) >= 16 }" :style="{ width: Math.min(cmd1From(si) / 21 * 100, 100) + '%' }"></div>
                </div>
                <button
                  v-if="isTouched(si, 1)"
                  class="cmd-minus cmd-minus-split"
                  @contextmenu.prevent
                  @pointerdown.stop.prevent="handleDown(si, 1, -1)"
                  @pointerup.stop.prevent="handleUp"
                  @pointercancel="handleUp"
                  @pointerleave="handleUp"
                >&minus;</button>
              </div>
              <div class="cmd-split-divider"></div>
              <!-- Commander 2 (bottom half): press = +1, corner − = correct -->
              <div
                class="cmd-split-half"
                @contextmenu.prevent
                @pointerdown.prevent="handleDown(si, 2, 1)"
                @pointerup.prevent="handleUp"
                @pointercancel="handleUp"
                @pointerleave="handleUp"
              >
                <div class="cmd-flash-full" :class="{ flash: isFlash(`${si}-2`), minus: isFlashMinus(`${si}-2`) }"></div>
                <div class="cmd-split-content">
                  <div class="cmd-num-wrap">
                    <div class="cmd-seat-dmg cmd-split-dmg" :class="{ 'has-dmg': cmd2From(si) > 0, lethal: cmd2From(si) >= 21 }">{{ cmd2From(si) }}</div>
                    <div v-if="cmd2Delta(si) !== 0" class="cmd-delta cmd-delta-split" :class="{ neg: cmd2Delta(si) < 0 }">{{ fmtDelta(cmd2Delta(si)) }}</div>
                  </div>
                </div>
                <div class="cmd-bar-bottom">
                  <div class="cmd-bar" :class="{ danger: cmd2From(si) >= 16 }" :style="{ width: Math.min(cmd2From(si) / 21 * 100, 100) + '%' }"></div>
                </div>
                <button
                  v-if="isTouched(si, 2)"
                  class="cmd-minus cmd-minus-split"
                  @contextmenu.prevent
                  @pointerdown.stop.prevent="handleDown(si, 2, -1)"
                  @pointerup.stop.prevent="handleUp"
                  @pointercancel="handleUp"
                  @pointerleave="handleUp"
                >&minus;</button>
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
  background: color-mix(in srgb, var(--lt-bg) 93%, transparent);
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
  position: relative;
  background: var(--lt-panel-bg);
  border: 2px solid var(--lt-border);
  border-radius: 3px;
  /* Padding scales with the panel so it doesn't eat half a narrow modal. */
  padding: clamp(12px, 3cqi, 24px);
  width: 92vw;
  max-width: 800px;
  /* Cap height + scroll so tall content doesn't push the modal off-screen
     on phone-landscape (which is short). */
  max-height: 95vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.75cqi, 14px);
  /* Container query context — interior sizes scale to the modal width
     (cqi). iPad-tuned values land at 800px modal width. */
  container-type: inline-size;
}

/* Counters row — wraps to a second line when the modal is narrower than
   ~4 × min-counter-width. */
.counters-row {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(4px, 0.75cqi, 6px);
  justify-content: center;
}

.role-box {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--lt-gold) 27%, transparent);
}

.role-box:hover {
  border-color: var(--lt-gold);
}

.reveal-role-box {
  cursor: pointer;
}

.death-active {
  border-color: #d95555;
}

.reveal-role-box:hover {
  border-color: var(--lt-text-dim);
}

.reveal-label {
  font-family: 'Cinzel', serif;
  /* Box-cqh-relative — 11% of box height matches 1rem at iPad box=148. */
  font-size: clamp(0.55rem, 11cqh, 1rem);
  font-weight: 700;
  color: color-mix(in srgb, var(--lt-text-dim) 27%, transparent);
  white-space: nowrap;
}

.reveal-label.active {
  color: var(--lt-text);
}

.reveal-icon-ms {
  font-size: 2.5rem;
  color: var(--lt-text);
}

.reveal-icon {
  font-size: 2rem;
  pointer-events: none;
}

.counter-box {
  /* Flex 1 across the row up to a sensible max. The min-width is tuned
     so wrapping prefers a clean 2+2 over a 3+1 on narrow modals. iPad
     width (~800px) fits all 4 in a row. Height is the smaller of
     cqi-derived (scales with modal width) and vh-derived (so a short
     viewport like phone-landscape doesn't push the seat grid out). */
  flex: 1 1 0;
  flex-shrink: 0;
  min-width: 130px;
  max-width: 160px;
  height: clamp(70px, min(20cqi, 22vh), 160px);
  background: var(--lt-bg);
  border: 1px solid var(--lt-border);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
  cursor: pointer;
  /* Nested container query context — children below size to the box
     itself (cqh) so a multi-line label like "Clone Lord" doesn't
     overflow when the box is short. iPad reference box is 158×148. */
  container-type: size;
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
  font-size: clamp(0.7rem, 14cqh, 1.3rem);
  color: var(--lt-text);
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
  background: color-mix(in srgb, var(--lt-role-knight) 22%, transparent);
}

.counter-flash-right.flash {
  background: color-mix(in srgb, var(--lt-role-goblin) 22%, transparent);
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
  /* Box-relative now that .counter-box is a container. iPad box ~148h
     → 43cqh ≈ 4rem; short box ~104h → ~2.8rem. */
  font-size: clamp(1.4rem, 43cqh, 4rem);
}

.role-box-img {
  /* 54% of the box height so the icon + 2-line label (e.g. "Clone Lord")
     always fits regardless of how short the box becomes. */
  width: clamp(28px, 54cqh, 80px);
  height: clamp(28px, 54cqh, 80px);
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
  color: var(--lt-text);
}

.counter-val {
  font-family: 'Cinzel', serif;
  font-size: clamp(1.1rem, 24cqh, 2.2rem);
  font-weight: 700;
  color: color-mix(in srgb, var(--lt-text-dim) 27%, transparent);
}

.counter-val.active {
  color: var(--lt-text);
}

.counter-val.lethal {
  color: #d95555;
}

/* Framing line above the seat grid. */
.cmd-header {
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.7rem, 2.2cqi, 1rem);
  color: var(--lt-text-dim);
  letter-spacing: 0.02em;
  margin: 0;
}

.cmd-header-name {
  color: var(--lt-text);
  font-weight: 700;
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
  /* Keep the row at its preferred (cmd-seat) height; if the panel runs
     out of vertical space, scroll instead of squishing one row. */
  flex-shrink: 0;
}

.cmd-seat {
  flex: 1;
  position: relative;
  /* Same combined cqi+vh cap so the seat grid shrinks on short viewports
     instead of being flex-compressed unevenly. */
  height: clamp(70px, min(27.5cqi, 28vh), 220px);
  overflow: hidden;
  border-radius: 3px;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
  background: var(--lt-bg);
  /* Nested container query context — children below size to the seat's
     own height, which lets the dual-commander split, icons, and damage
     readout shrink in lockstep on short viewports. iPad reference seat
     is ~247×206. */
  container-type: size;
}

.cmd-seat-grad {
  position: absolute;
  inset: 0;
  opacity: var(--lt-gradient-opacity);
  filter: saturate(var(--lt-gradient-saturate)) brightness(var(--lt-gradient-brightness));
  pointer-events: none;
}

/* Your own seat: taking commander damage from your own commander only
   happens on a steal, so it isn't the default target. Dim it to steer
   presses elsewhere, but leave it tappable for the steal edge case. */
.cmd-self {
  border: 2px solid #d9555566;
  opacity: 0.5;
}

.cmd-seat-icons {
  position: absolute;
  top: clamp(8px, 13.6cqh, 28px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  z-index: 4;
}

.cmd-seat-role {
  /* cqh = seat height now. 17.5% of iPad seat=206 ≈ 36px. */
  width: clamp(14px, 17.5cqh, 36px);
  height: clamp(14px, 17.5cqh, 36px);
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.cmd-seat-role-conversion {
  width: clamp(12px, 13.6cqh, 28px);
  height: clamp(12px, 13.6cqh, 28px);
}

/* House sigil — slightly larger than role icons since the heraldry
   detail benefits from extra size, and shadowed harder so it reads on
   any deck gradient. */
.cmd-seat-house {
  width: clamp(18px, 21.4cqh, 44px);
  height: clamp(18px, 21.4cqh, 44px);
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.75));
}

/* Single commander tap zone */
.cmd-tap-zone {
  position: absolute;
  inset: 0;
  display: flex;
  cursor: pointer;
  z-index: 1;
}

/* Full-seat flash. A press adds damage (red); the corner − corrects
   (green). One tap target, no left/right split, so there is no
   direction for the player to get wrong. */
.cmd-flash-full {
  position: absolute;
  inset: 0;
  background: transparent;
  transition: background-color 0.15s;
  pointer-events: none;
}

.cmd-flash-full.flash {
  background: color-mix(in srgb, var(--lt-role-goblin) 22%, transparent);
}

.cmd-flash-full.flash.minus {
  background: color-mix(in srgb, var(--lt-role-knight) 22%, transparent);
}

/* Correction button — deliberately subordinate to the primary tap so it
   never competes for attention. Bottom-left corner keeps it clear of the
   top name, the top-right partner toggle, and the centred damage value. */
.cmd-minus {
  position: absolute;
  bottom: 6px;
  left: 6px;
  z-index: 4;
  pointer-events: auto;
  min-width: clamp(20px, 22cqh, 34px);
  height: clamp(20px, 22cqh, 34px);
  padding: 0 clamp(4px, 4cqh, 8px);
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--lt-border) 40%, transparent);
  background: color-mix(in srgb, var(--lt-bg) 53%, transparent);
  color: color-mix(in srgb, var(--lt-text-dim) 60%, transparent);
  font-family: 'Cinzel', serif;
  font-size: clamp(0.8rem, 16cqh, 1.4rem);
  line-height: 1;
  cursor: pointer;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.cmd-minus:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}

/* Split halves are shorter — shrink the button so it sits cleanly in the
   corner of each half without crowding the divider. */
.cmd-minus-split {
  bottom: 4px;
  left: 4px;
  min-width: clamp(16px, 13cqh, 26px);
  height: clamp(16px, 13cqh, 26px);
  font-size: clamp(0.65rem, 10cqh, 1rem);
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

/* Single-commander seat with a role / conversion icon: nudge the
   centred damage value a touch below seat-centre so it visually
   anchors below the icon row instead of fighting it for the seat's
   vertical middle. */
.cmd-seat:not(.cmd-seat-split):has(.cmd-seat-icons) .cmd-seat-content {
  padding-top: clamp(6px, 8cqh, 18px);
}

.cmd-seat-name-top {
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.5rem, 7.8cqh, 1rem);
  color: var(--lt-text-dim);
}

.cmd-seat-name-top.has-dmg {
  color: var(--lt-text);
  pointer-events: none;
  z-index: 3;
}

.cmd-seat-dmg {
  font-family: 'Cinzel', serif;
  font-size: clamp(1.1rem, 27cqh, 3.5rem);
  font-weight: 700;
  color: color-mix(in srgb, var(--lt-text) 27%, transparent);
  line-height: 1.1;
}

/* The number stays centred in the seat; the delta hangs below it, out of
   flow, so it never shifts the total's position. */
.cmd-num-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Net delta entered this session. Gold = damage added, green = correction
   (matches the tap-flash tints). Reserved red stays on the total itself for
   the lethal state. */
.cmd-delta {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 2px;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.6rem, 10cqh, 1.1rem);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  color: var(--lt-gold);
}

.cmd-delta.neg {
  color: var(--lt-role-knight);
}

.cmd-delta-split {
  font-size: clamp(0.5rem, 7cqh, 0.85rem);
  margin-top: 1px;
}

.cmd-seat-dmg.has-dmg {
  color: var(--lt-text);
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
  background: color-mix(in srgb, var(--lt-border) 27%, transparent);
  z-index: 3;
}

.cmd-bar {
  height: 100%;
  background: var(--lt-gold);
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
  border: 1px solid color-mix(in srgb, var(--lt-border) 40%, transparent);
  background: color-mix(in srgb, var(--lt-bg) 53%, transparent);
  color: color-mix(in srgb, var(--lt-text-dim) 53%, transparent);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  display: flex;
  gap: 2px;
}

.partner-toggle:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
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
  background: color-mix(in srgb, var(--lt-border) 40%, transparent);
  z-index: 2;
}

.cmd-split-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
}

/* In partner mode shift the whole damage group below the icons (only when icons are shown). */
.cmd-seat-split.has-icons {
  /* Just enough headroom for the icon row above the dual halves —
     more than this and the two damage values bunch toward the seat's
     bottom edge (asymmetric reading) when the seat is short.
     The icon at top: 13.6cqh + size 17.5cqh ≈ 31cqh of seat; this
     14cqh keeps the icon row slightly intruding into the top half
     (icons render on top so the digit isn't actually hidden), but
     in return both halves are centred much closer to seat-centre. */
  padding-top: clamp(8px, 14cqh, 30px);
}

.cmd-split-dmg {
  font-size: clamp(0.8rem, 19.4cqh, 2.5rem);
}

.cmd-split-name {
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.45rem, 6.6cqh, 0.85rem);
  color: color-mix(in srgb, var(--lt-text) 53%, transparent);
  pointer-events: none;
  z-index: 3;
}
</style>
