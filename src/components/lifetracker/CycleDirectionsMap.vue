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

// Two mutual feud pairs in the cycle (A↔C, B↔D in cycle terms).
// We resolve via cycleRelations so this stays correct regardless of how
// HOUSES are labelled in the seats array.
const feudPairs = computed(() => {
  const seen = new Set()
  const pairs = []
  for (const seat of props.seats) {
    if (!seat || !seat.house) continue
    const rel = cycleRelations(seat.house)
    if (!rel) continue
    const key = [seat.house, rel.feud].sort().join('-')
    if (seen.has(key)) continue
    seen.add(key)
    const fromIdx = houseSeat(seat.house)
    const toIdx = houseSeat(rel.feud)
    if (fromIdx == null || toIdx == null) continue
    pairs.push({ key, from: fromIdx, to: toIdx, house: seat.house, otherHouse: rel.feud })
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

// Sword path used by CycleRelationIcon — reused inline so we can render
// crossed (feud) and single (rival) glyphs straight into the SVG.
const SWORD = 'M12 1 L13.75 2.75 L13.75 15 L17 15 L17 17 L13.5 17 L13.5 21 L14.25 21.5 L14.25 23 L9.75 23 L9.75 21.5 L10.5 21 L10.5 17 L7 17 L7 15 L10.25 15 L10.25 2.75 Z'

function lineGeom(fromIdx, toIdx) {
  const a = nodeFor(fromIdx)
  const b = nodeFor(toIdx)
  const start = edgePoint(b, a)
  const end = edgePoint(a, b)
  return { a, b, start, end }
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
function iconTransform(fromIdx, toIdx, size) {
  const t = isDiagonalLine(fromIdx, toIdx) ? 0.35 : 0.5
  const mid = midpoint(nodeFor(fromIdx), nodeFor(toIdx), t)
  const half = size / 2
  return `translate(${mid.x - half}, ${mid.y - half})`
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
  <div class="map-overlay" @click.self="emit('close')">
    <div class="map-card">
      <header class="map-header">
        <h2 class="map-title font-beleren">Kill Lists</h2>
        <p class="map-legend">
          <span class="legend-item"><svg class="legend-glyph" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path :transform="`rotate(45 12 9)`" :d="SWORD" /><path :transform="`rotate(-45 12 9)`" :d="SWORD" /></g></svg> Feud · mutual</span>
          <span class="legend-item"><svg class="legend-glyph rival" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" :transform="`rotate(45 12 12)`" :d="SWORD" /></svg> Rival · one-way</span>
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
        </defs>

        <!-- Feud lines: dashed, drawn first so rival arrows sit on top -->
        <g class="feud-lines">
          <template v-for="pair in feudPairs" :key="pair.key">
            <line
              :x1="lineGeom(pair.from, pair.to).start.x"
              :y1="lineGeom(pair.from, pair.to).start.y"
              :x2="lineGeom(pair.from, pair.to).end.x"
              :y2="lineGeom(pair.from, pair.to).end.y"
              stroke="#9a93b8"
              stroke-width="2"
              stroke-dasharray="6 4"
              opacity="0.75"
            />
            <g :transform="iconTransform(pair.from, pair.to, 28)">
              <circle cx="14" cy="14" r="13" fill="var(--lt-bg)" stroke="#9a93b8" stroke-width="1.5" />
              <svg x="3" y="3" width="22" height="22" viewBox="0 0 24 24">
                <g fill="var(--lt-text)">
                  <path :transform="`rotate(45 12 9)`" :d="SWORD" />
                  <path :transform="`rotate(-45 12 9)`" :d="SWORD" />
                </g>
              </svg>
            </g>
          </template>
        </g>

        <!-- Rival arrows -->
        <g class="rival-arrows">
          <template v-for="edge in rivalEdges" :key="edge.key">
            <line
              :x1="lineGeom(edge.from, edge.to).start.x"
              :y1="lineGeom(edge.from, edge.to).start.y"
              :x2="lineGeom(edge.from, edge.to).end.x"
              :y2="lineGeom(edge.from, edge.to).end.y"
              stroke="var(--lt-gold)"
              stroke-width="2.5"
              marker-end="url(#rivalArrow)"
              opacity="0.9"
            />
            <g :transform="iconTransform(edge.from, edge.to, 22)">
              <circle cx="11" cy="11" r="11" fill="var(--lt-bg)" stroke="var(--lt-gold)" stroke-width="1.5" />
              <svg x="2" y="2" width="18" height="18" viewBox="0 0 24 24">
                <path fill="var(--lt-gold)" :transform="`rotate(45 12 12)`" :d="SWORD" />
              </svg>
            </g>
          </template>
        </g>

        <!-- Player nodes -->
        <g class="nodes">
          <template v-for="(seat, i) in seats" :key="i">
            <g v-if="seat" :transform="`translate(${nodeFor(i).x}, ${nodeFor(i).y})`">
              <circle
                :r="NODE_R"
                :fill="'var(--lt-bg)'"
                :stroke="houseColor(seat.house)"
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
              <!-- Top row: labels stacked ABOVE the circle (house name
                   closest to the sigil, player name on the outside).
                   Bottom row: stacked BELOW with the same hierarchy. -->
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
  color: #9a93b8;
}

.legend-glyph.rival {
  color: var(--lt-gold);
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
