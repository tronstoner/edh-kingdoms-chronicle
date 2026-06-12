<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { HOUSE_COLORS, houseImageUrl, cycleRelations } from '../../lifetracker/cycle.js'

const props = defineProps({
  seats: { type: Array, required: true },
})

const emit = defineEmits(['close'])

// Reactive orientation — swaps the SVG viewBox + node coords so the
// 2x2 diagram fills the available space whether the viewport is wide
// (landscape: 520×380) or tall (portrait: 380×520). Without this swap
// a tall phone leaves the diagram floating in 60% empty vertical room.
const isPortrait = ref(false)
let mq

function updateOrientation() {
  if (typeof window === 'undefined') return
  isPortrait.value = window.matchMedia('(orientation: portrait)').matches
}

onMounted(() => {
  updateOrientation()
  mq = window.matchMedia('(orientation: portrait)')
  mq.addEventListener('change', updateOrientation)
})

onUnmounted(() => {
  mq?.removeEventListener('change', updateOrientation)
})

const VB_W = computed(() => (isPortrait.value ? 380 : 520))
const VB_H = computed(() => (isPortrait.value ? 520 : 380))
const NODE_R = 46
const NODES = computed(() =>
  isPortrait.value
    ? {
        0: { x: 90,  y: 110 },
        1: { x: 290, y: 110 },
        2: { x: 90,  y: 410 },
        3: { x: 290, y: 410 },
      }
    : {
        0: { x: 110, y: 90  },
        1: { x: 410, y: 90  },
        2: { x: 110, y: 290 },
        3: { x: 410, y: 290 },
      }
)

function nodeFor(seatIndex) {
  return NODES.value[seatIndex]
}

function houseSeat(houseName) {
  const idx = props.seats.findIndex(s => s && s.house === houseName)
  return idx >= 0 ? idx : null
}

// Endpoint trimmed back so it doesn't pierce the node circle.
function edgePoint(from, to, offset = NODE_R) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  return {
    x: to.x - (dx / len) * offset,
    y: to.y - (dy / len) * offset,
  }
}

function midpoint(a, b, t = 0.5) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

// Two mutual nemesis pairs in the cycle (A↔C, B↔D in cycle terms).
// We resolve via cycleRelations so this stays correct regardless of how
// HOUSES are labelled in the seats array.
const nemesisPairs = computed(() => {
  const seen = new Set()
  const pairs = []
  for (const seat of props.seats) {
    if (!seat || !seat.house) continue
    const rel = cycleRelations(seat.house)
    if (!rel) continue
    const key = [seat.house, rel.nemesis].sort().join('-')
    if (seen.has(key)) continue
    seen.add(key)
    const fromIdx = houseSeat(seat.house)
    const toIdx = houseSeat(rel.nemesis)
    if (fromIdx == null || toIdx == null) continue
    pairs.push({ key, from: fromIdx, to: toIdx, house: seat.house, otherHouse: rel.nemesis })
  }
  return pairs
})

// Directed rival edges, one per house (A→B, B→C, C→D, D→A).
const rivalEdges = computed(() => {
  const edges = []
  for (const seat of props.seats) {
    if (!seat || !seat.house) continue
    const rel = cycleRelations(seat.house)
    if (!rel) continue
    const fromIdx = houseSeat(seat.house)
    const toIdx = houseSeat(rel.rival)
    if (fromIdx == null || toIdx == null) continue
    edges.push({ key: `${seat.house}->${rel.rival}`, from: fromIdx, to: toIdx, fromHouse: seat.house, toHouse: rel.rival })
  }
  return edges
})

// Directed protect edges: each house points at the one they protect
// (= their hunter, the house that would hunt them, kept off the kill
// list). Runs counter-clockwise to the rival cycle.
const protectEdges = computed(() => {
  const edges = []
  for (const seat of props.seats) {
    if (!seat || !seat.house) continue
    const rel = cycleRelations(seat.house)
    if (!rel) continue
    const fromIdx = houseSeat(seat.house)
    const toIdx = houseSeat(rel.hunter)
    if (fromIdx == null || toIdx == null) continue
    edges.push({ key: `${seat.house}~>${rel.hunter}`, from: fromIdx, to: toIdx, fromHouse: seat.house, toHouse: rel.hunter })
  }
  return edges
})

// Sword path used by CycleRelationIcon — reused inline so we can render
// crossed (nemesis) and single (rival) glyphs straight into the SVG.
const SWORD = 'M12 1 L13.75 2.75 L13.75 15 L17 15 L17 17 L13.5 17 L13.5 21 L14.25 21.5 L14.25 23 L9.75 23 L9.75 21.5 L10.5 21 L10.5 17 L7 17 L7 15 L10.25 15 L10.25 2.75 Z'
const SHIELD = 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'

function lineGeom(fromIdx, toIdx) {
  const a = nodeFor(fromIdx)
  const b = nodeFor(toIdx)
  const start = edgePoint(b, a)
  const end = edgePoint(a, b)
  return { a, b, start, end }
}

// Perpendicular offset (clockwise 90° from the from→to direction).
// Used to slide a directed line sideways so the opposite-direction line
// between the same two nodes (rival vs protect) doesn't overlap it.
function perpOffset(fromIdx, toIdx, shift) {
  const a = nodeFor(fromIdx)
  const b = nodeFor(toIdx)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: (-dy / len) * shift, y: (dx / len) * shift }
}

function offsetLineGeom(fromIdx, toIdx, shift) {
  const g = lineGeom(fromIdx, toIdx)
  const o = perpOffset(fromIdx, toIdx, shift)
  return {
    start: { x: g.start.x + o.x, y: g.start.y + o.y },
    end:   { x: g.end.x + o.x,   y: g.end.y + o.y },
  }
}

// A line is "diagonal" if its endpoints differ in both x and y.
// In the 2x2 grid, the two diagonals cross at the SVG centre — so when
// two diagonal lines coexist we slide their icons off-centre along the
// line so they don't pile on top of each other.
function isDiagonalLine(fromIdx, toIdx) {
  const a = nodeFor(fromIdx)
  const b = nodeFor(toIdx)
  return a.x !== b.x && a.y !== b.y
}

// Returns an SVG translate that puts an icon of `size` pixels exactly on
// the line between two nodes. Axis-aligned lines get the dead centre;
// diagonal lines get t=0.35 (closer to the source) so a pair of crossing
// diagonals ends up with one icon on each side of the intersection.
function iconTransform(fromIdx, toIdx, size, shift = 0, alongShift = 0) {
  const diagonal = isDiagonalLine(fromIdx, toIdx)
  // Diagonals already use t=0.35 to avoid the centre crossing — leave
  // those alone. For non-diagonal (perimeter) edges, `alongShift` lets
  // callers slide the icon along the line so a counter-direction icon
  // (protect on the opposite-running line) doesn't sit at the same
  // midpoint as the rival icon.
  const t = diagonal ? 0.35 : 0.5 + alongShift
  const mid = midpoint(nodeFor(fromIdx), nodeFor(toIdx), t)
  const o = shift ? perpOffset(fromIdx, toIdx, shift) : { x: 0, y: 0 }
  const half = size / 2
  return `translate(${mid.x + o.x - half}, ${mid.y + o.y - half})`
}

// Top-row seats (0=TL, 1=TR) place their player + house labels ABOVE the
// circle so the lines emerging from the bottom of the sigil aren't
// covered by text. Bottom-row seats keep labels below.
function isTopRow(seatIndex) {
  return seatIndex === 0 || seatIndex === 1
}

function houseColor(name) {
  return HOUSE_COLORS[name] || 'var(--lt-gold)'
}
</script>

<template>
  <div class="map-overlay" @click="emit('close')">
    <div class="map-card">
      <header class="map-header">
        <h2 class="map-title font-beleren">Kill Lists</h2>
        <p class="map-legend">
          <span class="legend-item"><svg class="legend-glyph" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path :transform="`rotate(45 12 9)`" :d="SWORD" /><path :transform="`rotate(-45 12 9)`" :d="SWORD" /></g></svg> Nemesis · mutual</span>
          <span class="legend-item"><svg class="legend-glyph rival" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" :transform="`rotate(45 12 12)`" :d="SWORD" /></svg> Rival · one-way</span>
          <span class="legend-item"><svg class="legend-glyph protect" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" :d="SHIELD" /></svg> Protect · one-way</span>
        </p>
        <button class="lt-modal-close" @click="emit('close')" aria-label="Close">×</button>
      </header>

      <svg :viewBox="`0 0 ${VB_W} ${VB_H}`" class="map-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker
            id="rivalArrow"
            viewBox="0 0 10 10"
            refX="9" refY="5"
            markerWidth="8" markerHeight="8"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--lt-gold)" />
          </marker>
          <!-- Nemesis arrowhead — used at BOTH ends of the line.
               `auto-start-reverse` flips the marker at marker-start so the
               two arrows point outward (mutual relationship: A ↔ C). -->
          <marker
            id="nemesisArrow"
            viewBox="0 0 10 10"
            refX="9" refY="5"
            markerWidth="8" markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d95555" />
          </marker>
          <marker
            id="protectArrow"
            viewBox="0 0 10 10"
            refX="9" refY="5"
            markerWidth="5" markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6ab86a" />
          </marker>
        </defs>

        <!-- Player nodes: drawn FIRST so they sit behind the lines and
             arrows — otherwise the arrowhead tips get clipped by the
             house circles where they meet the node edge. The text
             labels live outside the node circles so they never overlap
             the lines. -->
        <g class="nodes">
          <template v-for="(seat, i) in seats" :key="i">
            <g v-if="seat" :transform="`translate(${nodeFor(i).x}, ${nodeFor(i).y})`">
              <circle
                :r="NODE_R"
                fill="var(--lt-bg)"
                stroke="#5a5040"
                stroke-width="3"
              />
              <image
                v-if="seat.house"
                :href="houseImageUrl(seat.house)"
                :x="-NODE_R * 0.7"
                :y="-NODE_R * 0.7"
                :width="NODE_R * 1.4"
                :height="NODE_R * 1.4"
                preserveAspectRatio="xMidYMid meet"
              />
              <template v-if="isTopRow(i)">
                <text
                  :x="0" :y="-(NODE_R + 22)"
                  text-anchor="middle"
                  fill="var(--lt-text)"
                  font-family="EB Garamond, serif"
                  font-size="14"
                >{{ seat.player || `Seat ${i + 1}` }}</text>
                <text
                  v-if="seat.house"
                  :x="0" :y="-(NODE_R + 6)"
                  text-anchor="middle"
                  :fill="houseColor(seat.house)"
                  font-family="Cinzel, serif"
                  font-size="14"
                  font-weight="600"
                  letter-spacing="0.05em"
                >House {{ seat.house }}</text>
              </template>
              <template v-else>
                <text
                  v-if="seat.house"
                  :x="0" :y="NODE_R + 18"
                  text-anchor="middle"
                  :fill="houseColor(seat.house)"
                  font-family="Cinzel, serif"
                  font-size="14"
                  font-weight="600"
                  letter-spacing="0.05em"
                >House {{ seat.house }}</text>
                <text
                  :x="0" :y="NODE_R + 36"
                  text-anchor="middle"
                  fill="var(--lt-text)"
                  font-family="EB Garamond, serif"
                  font-size="14"
                >{{ seat.player || `Seat ${i + 1}` }}</text>
              </template>
            </g>
          </template>
        </g>

        <!-- Nemesis lines: solid red with double-headed arrows, drawn
             after the nodes so arrowheads land on top of the circles. -->
        <g class="nemesis-lines">
          <template v-for="pair in nemesisPairs" :key="pair.key">
            <line
              :x1="lineGeom(pair.from, pair.to).start.x"
              :y1="lineGeom(pair.from, pair.to).start.y"
              :x2="lineGeom(pair.from, pair.to).end.x"
              :y2="lineGeom(pair.from, pair.to).end.y"
              stroke="#d95555"
              stroke-width="2.5"
              opacity="0.9"
              marker-start="url(#nemesisArrow)"
              marker-end="url(#nemesisArrow)"
            />
            <g :transform="iconTransform(pair.from, pair.to, 28)">
              <circle cx="14" cy="14" r="13" fill="var(--lt-bg)" stroke="#d95555" stroke-width="1.5" />
              <svg x="3" y="3" width="22" height="22" viewBox="0 0 24 24">
                <g fill="#d95555">
                  <path :transform="`rotate(45 12 9)`" :d="SWORD" />
                  <path :transform="`rotate(-45 12 9)`" :d="SWORD" />
                </g>
              </svg>
            </g>
          </template>
        </g>

        <!-- Protect arrows: dashed green. Offset perpendicular to the
             from→to direction (CW) so they sit parallel to the rival
             arrow that runs the other way between the same two nodes —
             both use the same perpendicular sign which lands them on
             opposite sides of the underlying edge. -->
        <g class="protect-arrows">
          <template v-for="edge in protectEdges" :key="edge.key">
            <line
              :x1="offsetLineGeom(edge.from, edge.to, 10).start.x"
              :y1="offsetLineGeom(edge.from, edge.to, 10).start.y"
              :x2="offsetLineGeom(edge.from, edge.to, 10).end.x"
              :y2="offsetLineGeom(edge.from, edge.to, 10).end.y"
              stroke="#6ab86a"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-dasharray="0.1 3"
              opacity="0.85"
              marker-end="url(#protectArrow)"
            />
            <g :transform="iconTransform(edge.from, edge.to, 16, 10, -0.1)">
              <circle cx="8" cy="8" r="8" fill="var(--lt-bg)" stroke="#6ab86a" stroke-width="1.2" />
              <svg x="2" y="2" width="12" height="12" viewBox="0 0 24 24">
                <path fill="#6ab86a" :d="SHIELD" />
              </svg>
            </g>
          </template>
        </g>

        <!-- Rival arrows -->
        <g class="rival-arrows">
          <template v-for="edge in rivalEdges" :key="edge.key">
            <line
              :x1="offsetLineGeom(edge.from, edge.to, 10).start.x"
              :y1="offsetLineGeom(edge.from, edge.to, 10).start.y"
              :x2="offsetLineGeom(edge.from, edge.to, 10).end.x"
              :y2="offsetLineGeom(edge.from, edge.to, 10).end.y"
              stroke="var(--lt-gold)"
              stroke-width="2.5"
              marker-end="url(#rivalArrow)"
              opacity="0.9"
            />
            <g :transform="iconTransform(edge.from, edge.to, 22, 10)">
              <circle cx="11" cy="11" r="11" fill="var(--lt-bg)" stroke="var(--lt-gold)" stroke-width="1.5" />
              <svg x="2" y="2" width="18" height="18" viewBox="0 0 24 24">
                <path fill="var(--lt-gold)" :transform="`rotate(45 12 12)`" :d="SWORD" />
              </svg>
            </g>
          </template>
        </g>

      </svg>
    </div>
  </div>
</template>

<style scoped>
.map-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 8, 6, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 12px;
  backdrop-filter: blur(4px);
}

/* Modal occupies nearly the whole viewport so the kill-list diagram —
   the whole point of the screen — gets all the room. Title + legend
   collapse to a single compact top bar; the SVG flex-fills the rest. */
.map-card {
  position: relative;
  background: var(--lt-bg);
  border: 1px solid var(--lt-border);
  border-radius: 6px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  width: min(1100px, 100%);
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 8px 14px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--lt-panel-bg-alt);
  flex-shrink: 0;
}

.map-title {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  color: var(--lt-gold);
  margin: 0;
  letter-spacing: 0.06em;
}

.map-legend {
  display: flex;
  gap: 14px;
  margin: 0;
  font-family: 'EB Garamond', serif;
  color: var(--lt-text-dim);
  font-size: 0.78rem;
  flex-wrap: wrap;
  flex: 1;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-glyph {
  width: 1em;
  height: 1em;
  color: #d95555;
}

.legend-glyph.rival {
  color: var(--lt-gold);
}

.legend-glyph.protect {
  color: #6ab86a;
}

/* SVG fills all remaining vertical space; preserveAspectRatio (default
   xMidYMid meet) keeps the diagram centred inside that area. */
.map-svg {
  width: 100%;
  height: 100%;
  flex: 1 1 0;
  min-height: 0;
  padding: 12px;
  display: block;
}
</style>
