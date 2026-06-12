<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import {
  HOUSES,
  HOUSE_COLORS,
  houseImageUrl,
  cycleRelations,
  turnPositionFor,
  CYCLE_SHAPES,
  representativeArrangement,
} from '../../lifetracker/cycle.js'
import {
  loadCycleShapeOptions,
  saveCycleShapeOptions,
  loadCycleManualMode,
  saveCycleManualMode,
} from '../../composables/useLifetrackerState.js'
import CycleRelationIcon from './CycleRelationIcon.vue'
import CycleDirectionsMap from './CycleDirectionsMap.vue'

const props = defineProps({
  seats: Array,
  startingSeatIndex: Number,
})

const emit = defineEmits(['redeal', 'swap-seats', 'roll-start', 'begin', 'back'])

// Animation state — cards flip in sequence after the shuffle pass.
const revealed = ref([false, false, false, false])
const dealing = ref(true)
const showStart = ref(false)
// Per-card displayed house during the spin. Reset every interval tick to
// a random house so each pass past the viewer shows a different identity
// until the card locks to its actual assignment at reveal time.
const shuffledHouse = ref([null, null, null, null])
let shuffleInterval = null

// Shape filter (persisted across sessions). Drives which arrangements
// are eligible when re-dealing.
const shapeOptions = ref(loadCycleShapeOptions())

// Whether the kill-list map is open.
const mapOpen = ref(false)

// Manual assignment mode. When on, the deal animation is skipped, all
// cards are immediately revealed, and the user can drag any card onto
// another to swap their House (and starting-seat marker if applicable).
const manualMode = ref(loadCycleManualMode())
const dragSource = ref(null)
const dragTarget = ref(null)
const dragMoved = ref(false)
const pointerX = ref(0)
const pointerY = ref(0)
const ghostSize = ref(80)
let dragOrigin = null
let onDocMove = null
let onDocUp = null

// Sword that spins in the centre when the starting seat is re-rolled,
// then decelerates to point at the chosen seat. Pivot is the SVG centre
// — at rotation 0deg the tip is up (12 o'clock), so each seat maps to
// a clockwise angle from north.
const swordSpinning = ref(false)
const swordFinalAngle = ref(0)
const swordDx = ref('0px')
const swordDy = ref('0px')
const SWORD_PATH = 'M12 1 L13.75 2.75 L13.75 15 L17 15 L17 17 L13.5 17 L13.5 21 L14.25 21.5 L14.25 23 L9.75 23 L9.75 21.5 L10.5 21 L10.5 17 L7 17 L7 15 L10.25 15 L10.25 2.75 Z'
let swordTimeout = null
const SWORD_ANIM_MS = 1700

function seatAngle(seatIndex) {
  // 2x2 layout: 0=TL, 1=TR, 2=BL, 3=BR. Clockwise from up.
  switch (seatIndex) {
    case 0: return 315
    case 1: return 45
    case 2: return 225
    case 3: return 135
    default: return 0
  }
}

function seatOffset(seatIndex) {
  // Direction the sword stabs after settling. The card centre sits at
  // ±25cq from the cards-area centre; back off by roughly half the
  // sword's length (the tip extends ~14cq past the sword's centre at the
  // 32cqi clamp range) so the *tip* lands on the card centre rather
  // than the sword overshooting it.
  switch (seatIndex) {
    case 0: return { x: '-16cqw', y: '-16cqh' }
    case 1: return { x:  '16cqw', y: '-16cqh' }
    case 2: return { x: '-16cqw', y:  '16cqh' }
    case 3: return { x:  '16cqw', y:  '16cqh' }
    default: return { x: '0px', y: '0px' }
  }
}

function randomHouse(exclude) {
  const opts = HOUSES.filter(h => h !== exclude)
  return opts[Math.floor(Math.random() * opts.length)]
}

function displayedHouse(seatIndex) {
  if (revealed.value[seatIndex]) return props.seats[seatIndex]?.house
  return shuffledHouse.value[seatIndex] || props.seats[seatIndex]?.house
}

// Per-card shuffle timing. All four cards start spinning at the same moment
// and start at the same rotational speed; ease-out brings each one to rest
// at a staggered time, and the matching reveal kicks in right when that
// card stops. Rotations scale with duration so the *initial* spin speed
// stays roughly constant across all four — they only differ in how long
// they keep going.
const shuffleSpec = [
  { duration: 950,  rotation: 1080 },
  { duration: 1280, rotation: 1440 },
  { duration: 1620, rotation: 1800 },
  { duration: 1980, rotation: 2160 },
]

const FLIP_MS = 600

function runAnimation() {
  revealed.value = [false, false, false, false]
  dealing.value = true
  showStart.value = false

  // Seed with random non-actual houses so the very first time the front
  // face becomes visible (just past 90° of the first spin), it's already
  // showing a "wrong" house — never spoils the assignment.
  shuffledHouse.value = props.seats.map(s => randomHouse(s?.house))

  if (shuffleInterval) clearInterval(shuffleInterval)
  shuffleInterval = setInterval(() => {
    shuffledHouse.value = shuffledHouse.value.map((cur, i) => {
      if (revealed.value[i]) return cur
      return randomHouse(cur)
    })
  }, 130)

  shuffleSpec.forEach(({ duration }, i) => {
    setTimeout(() => {
      revealed.value[i] = true
    }, duration)
  })

  const last = shuffleSpec[shuffleSpec.length - 1].duration
  setTimeout(() => {
    clearInterval(shuffleInterval)
    shuffleInterval = null
    dealing.value = false
    showStart.value = true
  }, last + FLIP_MS)
}

onUnmounted(() => {
  if (shuffleInterval) clearInterval(shuffleInterval)
  if (swordTimeout) clearTimeout(swordTimeout)
  if (onDocMove) document.removeEventListener('pointermove', onDocMove)
  if (onDocUp) {
    document.removeEventListener('pointerup', onDocUp)
    document.removeEventListener('pointercancel', onDocUp)
  }
})

function enterManualMode() {
  if (shuffleInterval) {
    clearInterval(shuffleInterval)
    shuffleInterval = null
  }
  revealed.value = [true, true, true, true]
  dealing.value = false
  showStart.value = true
  shuffledHouse.value = props.seats.map(s => s?.house || null)
}

function toggleManual() {
  manualMode.value = !manualMode.value
  saveCycleManualMode(manualMode.value)
  if (manualMode.value) enterManualMode()
}

function handleBegin() {
  if (swordSpinning.value) return
  // If no starting seat has been picked yet (e.g. after a Re-deal that
  // cleared it), run the sword animation first so the player can see who
  // starts before the game begins.
  if (props.startingSeatIndex == null) {
    handleRollStart()
    setTimeout(() => emit('begin'), SWORD_ANIM_MS + 150)
  } else {
    emit('begin')
  }
}

async function handleRollStart() {
  if (swordSpinning.value) return
  emit('roll-start')
  await nextTick()
  const idx = props.startingSeatIndex
  if (idx == null) return
  // 5 full rotations + the final settle angle, so the deceleration easing
  // has plenty of motion to absorb before resting on the picked seat.
  swordFinalAngle.value = 5 * 360 + seatAngle(idx)
  const offset = seatOffset(idx)
  swordDx.value = offset.x
  swordDy.value = offset.y
  swordSpinning.value = true
  if (swordTimeout) clearTimeout(swordTimeout)
  swordTimeout = setTimeout(() => {
    swordSpinning.value = false
    swordTimeout = null
  }, SWORD_ANIM_MS)
}

function onCardPointerDown(seatIndex, ev) {
  if (!manualMode.value) return
  // Only react to primary pointer presses (left mouse / touch).
  if (ev.button !== undefined && ev.button !== 0) return
  dragOrigin = { x: ev.clientX, y: ev.clientY }
  pointerX.value = ev.clientX
  pointerY.value = ev.clientY
  dragSource.value = seatIndex
  dragMoved.value = false
  // Measure the source's house image so the ghost matches its size exactly.
  const cell = ev.currentTarget?.closest('[data-cycle-seat]')
  const img = cell?.querySelector('.card-house-img')
  if (img) {
    const rect = img.getBoundingClientRect()
    ghostSize.value = Math.max(rect.width, rect.height)
  }
  onDocMove = (mv) => {
    if (dragSource.value === null) return
    pointerX.value = mv.clientX
    pointerY.value = mv.clientY
    const dx = mv.clientX - dragOrigin.x
    const dy = mv.clientY - dragOrigin.y
    if (!dragMoved.value && Math.hypot(dx, dy) > 8) dragMoved.value = true
    if (!dragMoved.value) return
    const el = document.elementFromPoint(mv.clientX, mv.clientY)
    const cell = el?.closest('[data-cycle-seat]')
    if (cell) {
      const idx = parseInt(cell.dataset.cycleSeat, 10)
      dragTarget.value = idx === dragSource.value ? null : idx
    } else {
      dragTarget.value = null
    }
  }
  onDocUp = () => {
    if (dragMoved.value && dragSource.value !== null && dragTarget.value !== null) {
      emit('swap-seats', dragSource.value, dragTarget.value)
    }
    dragSource.value = null
    dragTarget.value = null
    dragOrigin = null
    dragMoved.value = false
    document.removeEventListener('pointermove', onDocMove)
    document.removeEventListener('pointerup', onDocUp)
    document.removeEventListener('pointercancel', onDocUp)
    onDocMove = null
    onDocUp = null
  }
  document.addEventListener('pointermove', onDocMove)
  document.addEventListener('pointerup', onDocUp)
  document.addEventListener('pointercancel', onDocUp)
}

function shuffleStyle(i) {
  return {
    '--shuffle-duration': `${shuffleSpec[i].duration}ms`,
    '--shuffle-rot': `${shuffleSpec[i].rotation}deg`,
  }
}

onMounted(() => {
  if (manualMode.value) enterManualMode()
  else runAnimation()
})

function handleRedeal() {
  manualMode.value = false
  saveCycleManualMode(false)
  emit('redeal', JSON.parse(JSON.stringify(shapeOptions.value)))
  // Allow parent to re-deal then trigger animation again on next tick.
  setTimeout(runAnimation, 50)
}

// Toggling a shape option just persists the new preference; the next
// Re-deal will pick from the active pool. We deliberately don't trigger
// a deal here — changing settings shouldn't disturb the current view.
function setShapeEnabled(shapeId, value) {
  shapeOptions.value = {
    ...shapeOptions.value,
    [shapeId]: { ...shapeOptions.value[shapeId], enabled: value },
  }
  saveCycleShapeOptions(shapeOptions.value)
}

function setShapeMirror(shapeId, value) {
  shapeOptions.value = {
    ...shapeOptions.value,
    [shapeId]: { ...shapeOptions.value[shapeId], mirror: value },
  }
  saveCycleShapeOptions(shapeOptions.value)
}

function houseColor(house) {
  return HOUSE_COLORS[house] || 'var(--lt-text-dim)'
}

function relations(house) {
  return cycleRelations(house) || {}
}

function turnPos(seatIndex) {
  if (props.startingSeatIndex == null) return null
  return turnPositionFor(seatIndex, props.startingSeatIndex, props.seats.length)
}

// Tiny illustrative SVG for each shape card in the picker.
// Mirrors HTML/research/the-cycle.html Appendix figures but at small scale,
// drawn from the canonical (non-mirrored) representative arrangement.
function shapeIconArrangement(shapeId) {
  return representativeArrangement(shapeId, false) || ['A', 'B', 'C', 'D']
}

// Seat coords inside the small picker SVG (viewBox 80x70).
const PICKER_NODES = [
  { x: 18, y: 18 },
  { x: 62, y: 18 },
  { x: 18, y: 52 },
  { x: 62, y: 52 },
]

function pickerCycleLines(arrangement) {
  // arrangement[seat] = 'A'|'B'|'C'|'D'. Build the A→B→C→D→A arrows.
  const seatOf = {}
  arrangement.forEach((h, i) => { seatOf[h] = i })
  const order = ['A', 'B', 'C', 'D']
  const lines = []
  for (let i = 0; i < 4; i++) {
    const from = PICKER_NODES[seatOf[order[i]]]
    const to = PICKER_NODES[seatOf[order[(i + 1) % 4]]]
    // Trim endpoints back so arrows don't pierce nodes.
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const r = 7
    lines.push({
      x1: from.x + (dx / len) * r,
      y1: from.y + (dy / len) * r,
      x2: to.x - (dx / len) * r,
      y2: to.y - (dy / len) * r,
    })
  }
  return lines
}
</script>

<template>
  <div class="cycle-preview">
    <aside class="sidebar">
      <header class="sb-header">
        <h2 class="sb-title font-beleren">The Cycle</h2>
        <p class="sb-subtitle">Dealing the Houses…</p>
      </header>

      <div
        class="sb-shape"
        :class="{ 'manual-disabled': manualMode }"
        role="group"
        aria-label="Cycle shape filter"
        :aria-disabled="manualMode"
      >
        <div
          v-for="shape in CYCLE_SHAPES"
          :key="shape.id"
          class="shape-pill"
          :class="{ off: !shapeOptions[shape.id].enabled }"
        >
          <button
            class="shape-icon-btn"
            type="button"
            :aria-pressed="shapeOptions[shape.id].enabled"
            :title="shapeOptions[shape.id].enabled ? `Disable ${shape.label}` : `Enable ${shape.label}`"
            @click="setShapeEnabled(shape.id, !shapeOptions[shape.id].enabled)"
          >
            <svg viewBox="0 0 80 70" class="shape-icon">
              <defs>
                <marker
                  :id="`pickerArrow-${shape.id}`"
                  viewBox="0 0 10 10"
                  refX="9" refY="5"
                  markerWidth="5" markerHeight="5"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" :fill="shapeOptions[shape.id].enabled ? 'var(--lt-gold)' : 'var(--lt-border)'" />
                </marker>
              </defs>
              <line
                v-for="(ln, i) in pickerCycleLines(shapeIconArrangement(shape.id))"
                :key="i"
                :x1="ln.x1" :y1="ln.y1" :x2="ln.x2" :y2="ln.y2"
                :stroke="shapeOptions[shape.id].enabled ? 'var(--lt-gold)' : 'var(--lt-border)'"
                stroke-width="1.6"
                :marker-end="`url(#pickerArrow-${shape.id})`"
                opacity="0.9"
              />
              <g v-for="(node, i) in PICKER_NODES" :key="`n${i}`">
                <circle
                  :cx="node.x" :cy="node.y" r="7"
                  fill="var(--lt-bg)"
                  :stroke="shapeOptions[shape.id].enabled ? 'var(--lt-gold)' : '#5a4f3d'"
                  stroke-width="1.4"
                />
                <text
                  :x="node.x" :y="node.y + 3"
                  text-anchor="middle"
                  font-family="Cinzel, serif"
                  font-size="8"
                  font-weight="700"
                  :fill="shapeOptions[shape.id].enabled ? 'var(--lt-text)' : '#5a4f3d'"
                >{{ shapeIconArrangement(shape.id)[i] }}</text>
              </g>
            </svg>
          </button>
          <label class="shape-toggle">
            <input
              type="checkbox"
              :checked="shapeOptions[shape.id].enabled"
              @change="setShapeEnabled(shape.id, $event.target.checked)"
            />
            <span>{{ shape.label }}</span>
          </label>
          <label class="shape-mirror" :class="{ off: !shapeOptions[shape.id].enabled }">
            <input
              type="checkbox"
              :checked="shapeOptions[shape.id].mirror"
              :disabled="!shapeOptions[shape.id].enabled"
              @change="setShapeMirror(shape.id, $event.target.checked)"
            />
            <span>mirror</span>
          </label>
        </div>
      </div>

      <button
        class="btn-manual"
        :class="{ active: manualMode }"
        @click="toggleManual"
      >
        {{ manualMode ? '✓ Manual mode' : 'Manual mode' }}
      </button>

      <div class="sb-actions" :class="{ visible: showStart }">
        <button v-if="!manualMode" class="btn btn-secondary" @click="handleRedeal">
          <svg viewBox="0 0 24 24" class="btn-icon" aria-hidden="true">
            <path
              fill="currentColor"
              d="M17.65 6.35A8 8 0 0 0 4.06 11h2.02A6 6 0 0 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35zM6.35 17.65A8 8 0 0 0 19.94 13h-2.02A6 6 0 0 1 12 18c-1.66 0-3.14-.69-4.22-1.78L11 13H4v7l2.35-2.35z"
            />
          </svg>
          <span>Re-deal</span>
        </button>
        <button class="btn btn-secondary" @click="handleRollStart">
          <svg viewBox="0 0 24 24" class="btn-icon" aria-hidden="true">
            <path
              fill="currentColor"
              :transform="`rotate(45 12 12)`"
              :d="SWORD_PATH"
            />
          </svg>
          <span>Roll Start</span>
        </button>
        <button class="btn btn-primary" :disabled="swordSpinning" @click="handleBegin">
          <svg viewBox="0 0 24 24" class="btn-icon" aria-hidden="true">
            <g fill="currentColor">
              <path :transform="`rotate(45 12 9)`" :d="SWORD_PATH" />
              <path :transform="`rotate(-45 12 9)`" :d="SWORD_PATH" />
            </g>
          </svg>
          <span>Begin Game</span>
        </button>
      </div>

      <button class="btn btn-secondary sb-back" :class="{ visible: showStart }" @click="emit('back')">Back</button>
    </aside>

    <div class="cards" :class="{ shuffling: dealing, manual: manualMode }">
      <div
        v-for="seatIndex in [0, 1, 2, 3]"
        :key="seatIndex"
        class="card-cell"
        :class="{
          'drag-source': dragSource === seatIndex && dragMoved,
          'drag-target': dragTarget === seatIndex,
          'manual-grabbable': manualMode,
        }"
        :data-cycle-seat="seatIndex"
        @pointerdown="onCardPointerDown(seatIndex, $event)"
      >
        <div class="card-player">{{ seats[seatIndex]?.player || `Seat ${seatIndex + 1}` }}</div>
        <div
          class="card"
          :class="{ revealed: revealed[seatIndex], dealing }"
          :style="{
            ...shuffleStyle(seatIndex),
            ...(revealed[seatIndex] ? { '--house-color': houseColor(seats[seatIndex]?.house) } : {}),
          }"
        >
          <div class="card-face card-back">
            <div class="card-back-pattern"></div>
          </div>
          <div class="card-face card-front" :style="{ borderColor: houseColor(displayedHouse(seatIndex)) }">
            <span v-if="showStart && turnPos(seatIndex) === 1 && !swordSpinning" class="start-badge">Starts</span>
            <img
              v-if="displayedHouse(seatIndex)"
              class="card-house-img"
              :class="{ clickable: revealed[seatIndex] }"
              :src="houseImageUrl(displayedHouse(seatIndex))"
              :alt="displayedHouse(seatIndex)"
              :title="revealed[seatIndex] ? 'Show kill list map' : ''"
              @click="revealed[seatIndex] && (mapOpen = true)"
            />
            <div class="card-house-name" :style="{ color: houseColor(displayedHouse(seatIndex)) }">
              House {{ displayedHouse(seatIndex) }}
            </div>
            <div class="card-house-relations">
              <div class="rel-row">
                <span class="rel-label"><CycleRelationIcon kind="feud" />Feud</span>
                <span class="rel-value" :style="{ color: houseColor(relations(displayedHouse(seatIndex)).feud) }">{{ relations(displayedHouse(seatIndex)).feud }}</span>
              </div>
              <div class="rel-row">
                <span class="rel-label"><CycleRelationIcon kind="rival" />Rival</span>
                <span class="rel-value" :style="{ color: houseColor(relations(displayedHouse(seatIndex)).rival) }">{{ relations(displayedHouse(seatIndex)).rival }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sword that spins in the centre of the grid when re-rolling
           the starting seat. Decelerates onto the chosen seat. -->
      <svg
        v-if="swordSpinning"
        class="roll-sword"
        viewBox="0 0 24 24"
        :style="{
          '--sword-final-angle': swordFinalAngle + 'deg',
          '--sword-dx': swordDx,
          '--sword-dy': swordDy,
        }"
        aria-hidden="true"
      >
        <path fill="currentColor" :d="SWORD_PATH" />
      </svg>
    </div>

    <CycleDirectionsMap
      v-if="mapOpen"
      :seats="seats"
      @close="mapOpen = false"
    />

    <!-- Floating drag ghost that follows the pointer in manual mode -->
    <Teleport to="body">
      <img
        v-if="dragSource !== null && dragMoved && seats[dragSource]?.house"
        class="drag-ghost"
        :style="{
          left: pointerX + 'px',
          top: pointerY + 'px',
          width: ghostSize + 'px',
          height: ghostSize + 'px',
        }"
        :src="houseImageUrl(seats[dragSource].house)"
        :alt="seats[dragSource].house"
      />
    </Teleport>
  </div>
</template>

<style scoped>
/*
 * One layout, ported from public/cycle-proto.html. Two orientations:
 *
 *  - Landscape (default): single sidebar on the LEFT holding title +
 *    shape filter + action buttons (stacked top → down), cards 2×2
 *    filling the rest of the viewport.
 *  - Portrait: sidebar at the TOP as a horizontal strip — title row,
 *    shape pills row (each pill flex: 1 to spread equally), actions
 *    row (each button flex: 1) — cards 2×2 below.
 *
 * Compact landscape (≤ 700px viewport height — phone landscape):
 *   - shape pills collapse to a single row (icon + 2 checkboxes inline,
 *     labels hidden behind a half-moon glyph for the mirror) so each
 *     pill is ~44px tall;
 *   - action buttons lay out HORIZONTALLY across the sidebar bottom
 *     (Begin Game wraps to 2 lines as needed) so all three fit without
 *     pushing the third off-screen;
 *   - sidebar widens enough for the horizontal button row to breathe.
 *
 * Phone portrait (≤ 540px wide):
 *   - shape labels hidden (they'd wrap to two lines on a 390px phone);
 *     icon + 2 checkboxes + mirror glyph stay accessible.
 *
 * Cards: ALWAYS 2×2 — the grid is the table arrangement. No 5:7 aspect
 * constraint; cards fill the cell completely so there's no inner-cell
 * slack. Container queries on `.cards` let the children scale to the
 * available space.
 */
.cycle-preview {
  position: absolute;
  inset: 0;
  background: var(--lt-bg);
  display: grid;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
  grid-template-columns: minmax(200px, 240px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: "sidebar cards";
}

.sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
}

.sb-header { flex-shrink: 0; }

.sb-title {
  margin: 0;
  font-size: 1.4rem;
  color: var(--lt-gold);
  letter-spacing: 0.05em;
  line-height: 1.1;
}

.sb-subtitle {
  margin: 2px 0 0;
  font-family: 'EB Garamond', serif;
  font-style: italic;
  color: var(--lt-text-dim);
  font-size: 0.85rem;
}

.sb-shape {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.2s, filter 0.2s;
}

/* In manual mode the shape (random arrangement) filter is irrelevant —
   fade it out and lock interaction so the user can't toggle settings
   that won't take effect until a future random Re-deal. */
.sb-shape.manual-disabled {
  opacity: 0.35;
  filter: grayscale(0.7);
  pointer-events: none;
}

.shape-pill {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 12px;
  row-gap: 4px;
  align-items: center;
  padding: 10px 14px;
  min-height: 56px;
  border: 1px solid var(--lt-panel-bg-alt);
  background: var(--lt-panel-bg);
  border-radius: 4px;
  transition: opacity 0.2s, border-color 0.2s;
}

.shape-pill.off {
  opacity: 0.55;
  border-color: var(--lt-border);
}

.shape-icon-btn {
  grid-row: 1 / span 2;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 3px;
  transition: transform 0.15s;
  flex-shrink: 0;
}

.shape-icon-btn:hover { transform: scale(1.05); }

.shape-icon {
  width: 44px;
  height: 38px;
  display: block;
}

/* First option: checkbox + shape name as its label.
   Second option: checkbox + "mirror" as its label. */
.shape-toggle {
  grid-column: 2;
  align-self: end;
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--lt-text);
  letter-spacing: 0.03em;
  line-height: 1.15;
}

.shape-mirror {
  grid-column: 2;
  align-self: start;
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
  font-family: 'EB Garamond', serif;
  font-size: 0.78rem;
  color: var(--lt-text-dim);
  font-style: italic;
  line-height: 1.15;
}

/* Nudge the checkbox a touch so its visual centre aligns with the
   cap-height of the first label line (rather than the line's vertical
   centre) when the label wraps to two lines. */
.shape-toggle input,
.shape-mirror input {
  margin-top: 1px;
}

.shape-mirror.off { opacity: 0.6; cursor: default; }

.shape-toggle input,
.shape-mirror input {
  width: 18px;
  height: 18px;
  accent-color: var(--lt-gold);
  cursor: pointer;
}

.sb-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.4s, transform 0.4s;
}

.sb-actions.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Back lives below the main actions, separated and pushed to the bottom
   of the sidebar with margin-top:auto so it sits at the floor without
   crowding the primary flow. Compound selector .btn.sb-back wins over
   the responsive `.btn { flex: 1 1 0 }` rule (which would otherwise make
   it stretch to fill the sidebar's remaining vertical space). */
.btn.sb-back {
  margin-top: auto;
  flex: 0 0 auto;
  font-size: 0.9rem;
  min-height: 44px;
  padding: 10px 16px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.4s, transform 0.4s;
}

.btn.sb-back.visible {
  opacity: 1;
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn {
  font-family: 'Cinzel', serif;
  font-size: 1.05rem;
  padding: 14px 20px;
  min-height: 52px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-icon {
  width: 1.4em;
  height: 1.4em;
  flex: 0 0 auto;
  display: block;
}

.btn-primary {
  color: color-mix(in srgb, var(--lt-gold) 75%, #888);
  border: 2px solid color-mix(in srgb, var(--lt-gold) 75%, #888);
  background: color-mix(in srgb, var(--lt-gold) 10%, #0d0a07);
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--lt-gold) 16%, #0d0a07);
  border-color: var(--lt-gold);
}

.btn-secondary {
  color: var(--lt-text-dim);
  border: 1px solid var(--lt-border);
  background: none;
}

.btn-secondary:hover {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}

.btn-manual {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  padding: 10px 16px;
  min-height: 40px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--lt-text-dim);
  border: 1px dashed var(--lt-border);
  background: none;
  flex: 0 0 auto;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  letter-spacing: 0.04em;
}

.btn-manual:hover:not(:disabled) {
  border-color: var(--lt-text-dim);
  color: var(--lt-text);
}

.btn-manual.active {
  color: var(--lt-gold);
  border-color: var(--lt-gold);
  border-style: solid;
  background: color-mix(in srgb, var(--lt-gold) 10%, transparent);
}

.btn-manual:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== Cards ===== */
.cards {
  grid-area: cards;
  container-type: size;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  position: relative;
}

.roll-sword {
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(120px, 32cqi, 320px);
  height: clamp(120px, 32cqi, 320px);
  color: var(--lt-gold);
  pointer-events: none;
  z-index: 50;
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.75));
  transform-origin: 50% 50%;
  animation: sword-roll 1.7s cubic-bezier(0.1, 0.85, 0.25, 1) forwards;
}

@keyframes sword-roll {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) scale(0.5);
    opacity: 0;
  }
  8% {
    transform: translate(-50%, -50%) rotate(180deg) scale(1);
    opacity: 1;
  }
  62% {
    transform: translate(-50%, -50%) rotate(var(--sword-final-angle, 1800deg)) scale(1);
    opacity: 1;
  }
  /* Tiny windup: brief overshoot in scale before the thrust. */
  68% {
    transform: translate(-50%, -50%) rotate(var(--sword-final-angle, 1800deg)) scale(1.12);
    opacity: 1;
    animation-timing-function: cubic-bezier(0.2, 0.9, 0.25, 1);
  }
  /* Stab — a fast thrust outward past the card centre. */
  76% {
    transform:
      translate(calc(-50% + var(--sword-dx, 0px)), calc(-50% + var(--sword-dy, 0px)))
      rotate(var(--sword-final-angle, 1800deg))
      scale(0.95);
    opacity: 0.9;
    animation-timing-function: linear;
  }
  /* Held at the stabbed position, fading out. */
  100% {
    transform:
      translate(calc(-50% + var(--sword-dx, 0px)), calc(-50% + var(--sword-dy, 0px)))
      rotate(var(--sword-final-angle, 1800deg))
      scale(0.9);
    opacity: 0;
  }
}

.card-cell {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.card-cell.manual-grabbable {
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.card-cell.manual-grabbable .card { transition: opacity 0.18s, transform 0.22s cubic-bezier(0.3, 0.7, 0.4, 1); }
.card-cell.manual-grabbable .card-player { transition: opacity 0.18s; }

/* Source: clearly the origin, faded in place — the floating ghost
   shows where the cursor is and what's being moved. */
.card-cell.drag-source {
  cursor: grabbing;
}
.card-cell.drag-source .card { opacity: 0.18; }
.card-cell.drag-source .card-player { opacity: 0.3; }

/* Target: strong, animated highlight so the drop zone reads immediately. */
.card-cell.drag-target .card-front {
  box-shadow:
    0 0 0 3px var(--lt-gold),
    0 0 36px color-mix(in srgb, var(--lt-gold) 55%, transparent);
}
.card-cell.drag-target .card {
  transform: scale(1.04);
}

/* The floating ghost is teleported to body and follows the pointer in
   manual mode. Sits above everything via fixed positioning + high z-index;
   `pointer-events: none` ensures elementFromPoint resolves to the card
   beneath it, not the ghost itself. Dimensions match the source card's
   house icon, measured at drag start. */
.drag-ghost {
  position: fixed;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1000;
  object-fit: contain;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.65));
  animation: ghost-appear 0.16s cubic-bezier(0.18, 0.85, 0.32, 1.2);
  will-change: left, top;
}

@keyframes ghost-appear {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.55);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.card-player {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  color: var(--lt-text);
  letter-spacing: 0.04em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  flex-shrink: 0;
}

.card {
  position: relative;
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  perspective: 900px;
  transform-style: preserve-3d;
}

.card-face {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-back {
  background: linear-gradient(135deg, var(--lt-panel-bg-alt), var(--lt-bg));
  border: 2px solid var(--lt-border);
  transition: transform 0.6s cubic-bezier(0.3, 0.7, 0.4, 1);
  transform: rotateY(0deg);
}

.card-back-pattern {
  width: 60%;
  height: 60%;
  border: 2px solid color-mix(in srgb, var(--lt-gold) 27%, transparent);
  border-radius: 4px;
  background:
    repeating-linear-gradient(45deg, color-mix(in srgb, var(--lt-gold) 7%, transparent) 0, color-mix(in srgb, var(--lt-gold) 7%, transparent) 4px, transparent 4px, transparent 8px);
}

.card-front {
  background: var(--lt-panel-bg);
  border: 2px solid var(--lt-border);
  transform: rotateY(180deg);
  transition: transform 0.6s cubic-bezier(0.3, 0.7, 0.4, 1), box-shadow 0.4s;
  padding: 14px;
  gap: 8px;
}

.card.revealed .card-back { transform: rotateY(-180deg); }
.card.revealed .card-front {
  transform: rotateY(0deg);
  box-shadow: 0 0 24px var(--house-color, var(--lt-gold))44;
}

.card.dealing {
  animation: spin-shuffle var(--shuffle-duration, 1200ms)
    cubic-bezier(0.12, 0.78, 0.28, 1) forwards;
}

@keyframes spin-shuffle {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(var(--shuffle-rot, 1440deg)); }
}

.card-house-img {
  flex: 1 1 auto;
  min-height: 0;
  width: auto;
  max-width: 85%;
  max-height: 70%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
  transition: transform 0.15s, filter 0.15s;
}

.card-house-img.clickable { cursor: pointer; }
.card-house-img.clickable:hover {
  transform: scale(1.04);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6)) brightness(1.1);
}

.card-house-name {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.85rem, 3.5cqi, 1.2rem);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.card-house-relations {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  padding: 0 8px;
  flex-shrink: 0;
}

/* Default cards (2×2 layout): rel rows are centred below the house
   name as one compact "FEUD  Lion" block. */
.rel-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'EB Garamond', serif;
  font-size: clamp(0.8rem, 2.2cqi, 1.15rem);
}

.rel-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--lt-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: clamp(0.8rem, 2.2cqi, 1.15rem);
}

.rel-value { color: var(--lt-text); }

.start-badge {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  color: var(--lt-gold);
  border: 1px solid var(--lt-gold);
  border-radius: 3px;
  padding: 2px 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
  white-space: nowrap;
  z-index: 2;
  animation: pop 0.5s ease;
}

@keyframes pop {
  0% { transform: translateX(-50%) scale(0.6); opacity: 0; }
  60% { transform: translateX(-50%) scale(1.15); opacity: 1; }
  100% { transform: translateX(-50%) scale(1); }
}

/* ===== Compact landscape (phone landscape & wide-short windows) =====
 * Same shape-pill structure as the default (icon left, two labelled
 * checkboxes stacked on the right) but with smaller fonts so the
 * labels fit alongside the checkboxes. Cards switch to a horizontal
 * info layout (shield left, name + rel rows centred vertically right)
 * to use the wide-and-short cell shape properly.
 */
@media (orientation: landscape) and (max-height: 700px) {
  .cycle-preview {
    gap: 10px;
    padding: 10px;
    grid-template-columns: minmax(190px, 220px) minmax(0, 1fr);
  }
  .sidebar { gap: 10px; }
  .sb-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .sb-title { font-size: 1.05rem; }
  .sb-subtitle { font-size: 0.7rem; }
  .sb-shape { gap: 6px; }

  /* Compact pill: keep the two-row label layout, just shrink fonts &
     paddings so it fits. Both labels remain readable. */
  .shape-pill {
    column-gap: 8px;
    row-gap: 1px;
    padding: 4px 8px;
    min-height: 44px;
  }
  .shape-icon { width: 30px; height: 26px; }
  .shape-toggle { font-size: 0.85rem; gap: 5px; }
  .shape-mirror { font-size: 0.78rem; gap: 5px; }
  .shape-toggle input,
  .shape-mirror input { width: 16px; height: 16px; }

  .sb-actions {
    flex-direction: row;
    gap: 6px;
  }
  .btn {
    flex: 1 1 0;
    min-width: 0;
    white-space: normal;
    line-height: 1.15;
    padding: 8px 6px;
    font-size: 0.85rem;
    min-height: 44px;
  }

  /* Card content: shield on the LEFT, name + rels stacked on the right
     and vertically centred against the shield. Fills the short+wide
     cell properly instead of just scaling the shield down. */
  .card-front {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      "shield name"
      "shield rels";
    column-gap: 12px;
    row-gap: 4px;
    align-items: center;
    justify-content: start;
    padding: 10px 12px;
  }
  .card-house-img {
    grid-area: shield;
    align-self: stretch;
    justify-self: center;
    flex: none;
    width: auto;
    height: 100%;
    aspect-ratio: 1;
    max-height: 100%;
  }
  .card-house-name {
    grid-area: name;
    align-self: end;
    text-align: left;
    font-size: clamp(0.85rem, 4.5cqi, 1.1rem);
    line-height: 1.05;
    padding-top: 1lh;
  }
  .card-house-relations {
    grid-area: rels;
    align-self: start;
    align-items: flex-start;
    padding: 0;
    gap: 1px;
  }
  .rel-row { font-size: 0.7rem; gap: 4px; }
  .rel-label { font-size: 0.6rem; gap: 3px; }
  .card-player { font-size: 0.78rem; }
}

/* ===== Narrow compact landscape (iPhone SE ~568px wide) ===== */
@media (orientation: landscape) and (max-height: 700px) and (max-width: 690px) {
  .card-house-img {
    max-height: 65%;
  }
}

/* ===== Portrait ===== */
@media (orientation: portrait) {
  .cycle-preview {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      "sidebar"
      "cards";
    padding: 14px;
    gap: 14px;
  }
  .sidebar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .sb-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    gap: 12px;
  }
  .sb-title { font-size: 1.35rem; }
  .sb-subtitle { font-size: 0.85rem; }
  .sb-shape {
    flex-direction: row;
    gap: 8px;
    flex-wrap: nowrap;
    align-items: stretch;
  }
  .shape-pill {
    flex: 1 1 0;
    min-width: 0;
    column-gap: 10px;
    row-gap: 2px;
    padding: 8px 10px;
    min-height: 52px;
  }
  .shape-icon { width: 36px; height: 30px; }
  .sb-actions {
    flex-direction: row;
    gap: 10px;
    align-items: stretch;
  }
  .btn {
    flex: 1 1 0;
    min-width: 0;
    min-height: 52px;
    padding: 14px 12px;
    font-size: 1rem;
  }
}

/* ===== Phone portrait ===== */
@media (orientation: portrait) and (max-width: 540px) {
  .cycle-preview { padding: 10px; gap: 10px; }
  .sb-title { font-size: 1.2rem; }
  .sb-subtitle { font-size: 0.8rem; }
  .shape-pill { padding: 6px; }
  .shape-icon { width: 30px; height: 26px; }
  .shape-toggle span,
  .shape-mirror span { display: none; }
  .shape-mirror::after {
    content: '◐';
    font-size: 1rem;
    color: var(--lt-text-dim);
    margin-left: 2px;
  }
  .btn { padding: 12px 8px; font-size: 0.9rem; }
}
</style>
