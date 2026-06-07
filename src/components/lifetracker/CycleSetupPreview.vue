<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
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
} from '../../composables/useLifetrackerState.js'
import CycleRelationIcon from './CycleRelationIcon.vue'
import CycleDirectionsMap from './CycleDirectionsMap.vue'

const props = defineProps({
  seats: Array,
  startingSeatIndex: Number,
})

const emit = defineEmits(['redeal', 'begin', 'back'])

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
})

function shuffleStyle(i) {
  return {
    '--shuffle-duration': `${shuffleSpec[i].duration}ms`,
    '--shuffle-rot': `${shuffleSpec[i].rotation}deg`,
  }
}

onMounted(runAnimation)

function handleRedeal() {
  emit('redeal', JSON.parse(JSON.stringify(shapeOptions.value)))
  // Allow parent to re-deal then trigger animation again on next tick.
  setTimeout(runAnimation, 50)
}

// Toggling a shape option saves to localStorage and re-deals so the new
// constraint takes effect immediately. If all shapes get disabled the
// deal function falls back to the full pool — we don't lock the user out.
function setShapeEnabled(shapeId, value) {
  shapeOptions.value = {
    ...shapeOptions.value,
    [shapeId]: { ...shapeOptions.value[shapeId], enabled: value },
  }
  saveCycleShapeOptions(shapeOptions.value)
  handleRedeal()
}

function setShapeMirror(shapeId, value) {
  shapeOptions.value = {
    ...shapeOptions.value,
    [shapeId]: { ...shapeOptions.value[shapeId], mirror: value },
  }
  saveCycleShapeOptions(shapeOptions.value)
  handleRedeal()
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

      <div class="sb-shape" role="group" aria-label="Cycle shape filter">
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

      <div class="sb-actions" :class="{ visible: showStart }">
        <button class="btn btn-secondary" @click="emit('back')">Back</button>
        <button class="btn btn-secondary" @click="handleRedeal">Re-deal</button>
        <button class="btn btn-primary" @click="emit('begin')">Begin Game</button>
      </div>
    </aside>

    <div class="cards" :class="{ shuffling: dealing }">
      <div v-for="seatIndex in [0, 1, 2, 3]" :key="seatIndex" class="card-cell">
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
            <span v-if="showStart && turnPos(seatIndex) === 1" class="start-badge">Starts</span>
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
    </div>

    <CycleDirectionsMap
      v-if="mapOpen"
      :seats="seats"
      @close="mapOpen = false"
    />
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

.btn {
  font-family: 'Cinzel', serif;
  font-size: 1.05rem;
  padding: 14px 20px;
  min-height: 52px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary {
  color: var(--lt-gold);
  border: 2px solid color-mix(in srgb, var(--lt-gold) 40%, transparent);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--lt-gold) 20%, transparent);
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
   name as one compact "FEUD  Lion" block. The horizontal compact-
   landscape card layout overrides this back to left-aligned. */
.rel-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'EB Garamond', serif;
  font-size: 0.8rem;
}

.rel-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--lt-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.65rem;
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
    grid-template-rows: auto auto;
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
    align-self: center;
    flex: none;
    width: auto;
    height: 100%;
    max-width: 45%;
    max-height: 100%;
  }
  .card-house-name {
    grid-area: name;
    align-self: end;
    text-align: left;
    font-size: clamp(0.85rem, 4.5cqi, 1.1rem);
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
