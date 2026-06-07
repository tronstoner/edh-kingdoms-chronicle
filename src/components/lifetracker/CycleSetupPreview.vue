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
    <div class="preview-header">
      <h2 class="preview-title font-beleren">The Cycle</h2>
      <p class="preview-subtitle">Dealing the Houses…</p>
    </div>

    <div class="preview-body">
      <!-- Left rail: shape filter -->
      <aside class="shape-panel">
        <h3 class="shape-panel-title">Cycle shape</h3>
        <p class="shape-panel-hint">Limit how the houses can sit on the table.</p>
        <div class="shape-list">
          <div
            v-for="shape in CYCLE_SHAPES"
            :key="shape.id"
            class="shape-card"
            :class="{ disabled: !shapeOptions[shape.id].enabled }"
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
            <div class="shape-meta">
              <label class="shape-toggle">
                <input
                  type="checkbox"
                  :checked="shapeOptions[shape.id].enabled"
                  @change="setShapeEnabled(shape.id, $event.target.checked)"
                />
                <span class="shape-label">{{ shape.label }}</span>
              </label>
              <label class="shape-mirror" :class="{ off: !shapeOptions[shape.id].enabled }">
                <input
                  type="checkbox"
                  :checked="shapeOptions[shape.id].mirror"
                  :disabled="!shapeOptions[shape.id].enabled"
                  @change="setShapeMirror(shape.id, $event.target.checked)"
                />
                <span>Allow mirror</span>
              </label>
            </div>
          </div>
        </div>
      </aside>

      <!-- Center: the dealt cards -->
      <div class="cards-grid" :class="{ shuffling: dealing }">
        <div class="cards-row">
          <template v-for="seatIndex in [0, 1]" :key="seatIndex">
            <div class="card-cell">
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
          </template>
        </div>
        <div class="cards-row">
          <template v-for="seatIndex in [2, 3]" :key="seatIndex">
            <div class="card-cell">
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
          </template>
        </div>
      </div>
    </div>

    <div class="preview-actions" :class="{ visible: showStart }">
      <button class="btn btn-secondary" @click="emit('back')">Back</button>
      <button class="btn btn-secondary" @click="handleRedeal">Re-deal</button>
      <button class="btn btn-primary" @click="emit('begin')">Begin Game</button>
    </div>

    <CycleDirectionsMap
      v-if="mapOpen"
      :seats="seats"
      @close="mapOpen = false"
    />
  </div>
</template>

<style scoped>
.cycle-preview {
  position: absolute;
  inset: 0;
  background: var(--lt-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px;
  gap: 14px;
  overflow-y: auto;
}

.preview-header {
  text-align: center;
  flex-shrink: 0;
}

.preview-title {
  font-size: 1.6rem;
  color: var(--lt-gold);
  letter-spacing: 0.05em;
  margin: 0;
  line-height: 1.1;
}

.preview-subtitle {
  font-family: 'EB Garamond', serif;
  font-style: italic;
  color: var(--lt-text-dim);
  margin: 2px 0 0;
  font-size: 0.85rem;
}

.preview-body {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex-shrink: 0;
}

/* Float the shape picker absolutely along the left edge so the cards
   stay centred in the viewport regardless of the panel's width. Mirrors
   how the action buttons float to the right in landscape mode. */
.shape-panel {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shape-panel-title {
  font-family: 'Cinzel', serif;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lt-gold);
  margin: 0;
}

.shape-panel-hint {
  font-family: 'EB Garamond', serif;
  font-style: italic;
  color: var(--lt-text-dim);
  font-size: 0.75rem;
  margin: 0 0 4px;
  line-height: 1.3;
}

.shape-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shape-card {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--lt-panel-bg-alt);
  background: var(--lt-panel-bg);
  border-radius: 4px;
  transition: opacity 0.2s, border-color 0.2s;
}

.shape-card.disabled {
  opacity: 0.55;
  border-color: #1f1b16;
}

.shape-icon-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 3px;
  transition: transform 0.15s;
}

.shape-icon-btn:hover { transform: scale(1.05); }

.shape-icon {
  width: 56px;
  height: 50px;
  display: block;
}

.shape-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.shape-toggle, .shape-mirror {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: 'EB Garamond', serif;
  color: var(--lt-text);
  font-size: 0.78rem;
}

.shape-toggle input, .shape-mirror input {
  accent-color: var(--lt-gold);
  cursor: pointer;
}

.shape-label {
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}

.shape-mirror {
  color: var(--lt-text-dim);
  font-size: 0.7rem;
  font-style: italic;
}

.shape-mirror.off {
  opacity: 0.6;
  cursor: default;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  max-width: 760px;
  min-width: 0;
}

.cards-row {
  display: flex;
  gap: 18px;
  justify-content: center;
}

.card-cell {
  flex: 1;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
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
  width: 100%;
}

.card {
  position: relative;
  width: 100%;
  aspect-ratio: 5 / 7;
  perspective: 900px;
  transform-style: preserve-3d;
}

.card-face {
  position: absolute;
  inset: 0;
  border-radius: 8px;
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
  padding: 10px;
  gap: 4px;
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
  width: 85%;
  max-height: 70%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
  transition: transform 0.15s, filter 0.15s;
}

.card-house-img.clickable {
  cursor: pointer;
}

.card-house-img.clickable:hover {
  transform: scale(1.04);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6)) brightness(1.1);
}

.card-house-name {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  letter-spacing: 0.04em;
}

.card-house-relations {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 0 8px;
}

.rel-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.rel-value {
  color: var(--lt-text);
}

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

.preview-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.4s, transform 0.4s;
}

.preview-actions.visible {
  opacity: 1;
  transform: translateY(0);
}

.btn {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  padding: 10px 22px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

/* Landscape with limited height (iPad mini / 11" landscape, ~768-834px):
   keep header + cards in the centred column flow (so the cards stay
   aligned under the title) and float the buttons absolutely to the
   right side of the screen so they don't push the cards off-centre. */
@media (orientation: landscape) and (max-height: 900px) {
  .cycle-preview {
    padding: 14px 18px;
    gap: 10px;
  }

  .cards-grid { gap: 12px; }

  .preview-title { font-size: 1.4rem; }
  .preview-subtitle { font-size: 0.8rem; }

  .shape-panel { width: 180px; }
  .shape-icon { width: 50px; height: 44px; }

  .preview-actions {
    position: absolute;
    right: 24px;
    top: 50%;
    flex-direction: column;
    width: 150px;
    transform: translateY(calc(-50% + 8px));
  }

  .preview-actions.visible {
    transform: translateY(-50%);
  }

  .btn {
    width: 100%;
  }
}

/* Portrait / narrow viewports: stack the shape panel above the cards so
   it doesn't overlap them. Un-absolute it from the left edge. */
@media (max-width: 720px) {
  .preview-body {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .shape-panel {
    position: static;
    transform: none;
    width: 100%;
  }
  .shape-list {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
  .shape-card {
    flex: 1 1 200px;
    max-width: 260px;
  }
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
</style>
