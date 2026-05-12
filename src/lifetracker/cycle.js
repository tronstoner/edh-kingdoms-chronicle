// The Cycle — 4-player Commander variant.
// House identifiers and kill-list math. House names ('Lion', 'Oak', 'Dragon', 'Ash')
// are display labels; the cycle ID (A/B/C/D) is what gets stored for analytics.

export const HOUSES = ['Lion', 'Oak', 'Dragon', 'Ash']

// Binding from the rules document: A=Lion, B=Oak, C=Dragon, D=Ash.
export const HOUSE_TO_ID = { Lion: 'A', Oak: 'B', Dragon: 'C', Ash: 'D' }
export const ID_TO_HOUSE = { A: 'Lion', B: 'Oak', C: 'Dragon', D: 'Ash' }

// Cycle math: each House's feud (mutual, opposite in the cycle), rival (next CW), hunter (prev CW).
// A→B→C→D→A: rival is +1, hunter is -1, feud is +2.
const ORDER = ['Lion', 'Oak', 'Dragon', 'Ash']

export function cycleRelations(house) {
  const i = ORDER.indexOf(house)
  if (i < 0) return null
  return {
    feud: ORDER[(i + 2) % 4],
    rival: ORDER[(i + 1) % 4],
    hunter: ORDER[(i + 3) % 4],
  }
}

// Each player's kill list (feud + rival). Used for win-condition hinting.
export function killList(house) {
  const rel = cycleRelations(house)
  return rel ? [rel.feud, rel.rival] : []
}

// House heraldry tint — used for panel border accent and badge glow.
// Picked to evoke the lore (Lion: gold; Oak: warm green; Dragon: ember red; Ash: pale grey-purple).
export const HOUSE_COLORS = {
  Lion: '#e2b84a',
  Oak: '#6a9c4a',
  Dragon: '#c4533a',
  Ash: '#9a93b8',
}

const BASE = import.meta.env.BASE_URL

export function houseImageUrl(house) {
  return house ? `${BASE}houses/${house}.png` : null
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Randomised House assignment for a 4-seat table.
export function assignHouses() {
  return shuffle(HOUSES)
}

// Cycle "shapes on the table" — see Appendix of research/the-cycle.html.
// The cycle math is invariant, but the seating yields one of three shapes
// based on where the feud pairs sit relative to the table grid.
export const CYCLE_SHAPES = [
  { id: 'diagonal',   label: 'Diagonal feuds' },
  { id: 'vertical',   label: 'Vertical feuds' },
  { id: 'horizontal', label: 'Horizontal feuds' },
]

// Physical seat layout in the 4-2t2b table: 0=TL, 1=TR, 2=BL, 3=BR.
// SEAT_X/SEAT_Y are normalised grid coords (-1/+1) used for shape math.
const SEAT_X = [-1, 1, -1, 1]
const SEAT_Y = [-1, -1, 1, 1]

// Classify a seat→house assignment by its shape and chirality.
// `houses` is an array of 4 House names (or letters) indexed by seat.
export function classifyArrangement(houses) {
  if (!houses || houses.length !== 4) return null
  const pos = {}
  houses.forEach((h, i) => {
    const id = HOUSE_TO_ID[h] || h
    pos[id] = i
  })
  if (pos.A == null || pos.B == null || pos.C == null || pos.D == null) return null
  const sameCol = SEAT_X[pos.A] === SEAT_X[pos.C]
  const sameRow = SEAT_Y[pos.A] === SEAT_Y[pos.C]
  let shape
  if (sameCol) shape = 'vertical'
  else if (sameRow) shape = 'horizontal'
  else shape = 'diagonal'
  // Chirality: cross product of (B-A) × (D-A). Each shape's HTML "base"
  // example normalises to mirror=false; horizontal flips because its
  // canonical traversal winds the opposite way.
  const cross =
    (SEAT_X[pos.B] - SEAT_X[pos.A]) * (SEAT_Y[pos.D] - SEAT_Y[pos.A]) -
    (SEAT_Y[pos.B] - SEAT_Y[pos.A]) * (SEAT_X[pos.D] - SEAT_X[pos.A])
  let mirror = cross < 0
  if (shape === 'horizontal') mirror = !mirror
  return { shape, mirror }
}

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()]
  const out = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) out.push([arr[i], ...p])
  }
  return out
}

// All 24 House assignments precomputed with their shape classification.
// Used to filter the deal pool down to whichever shapes the user enabled.
const ALL_ARRANGEMENTS = permutations(HOUSES).map(perm => ({
  perm,
  ...classifyArrangement(perm),
}))

export const DEFAULT_SHAPE_OPTIONS = {
  diagonal:   { enabled: true, mirror: true },
  vertical:   { enabled: true, mirror: true },
  horizontal: { enabled: true, mirror: true },
}

// Pick a random House assignment that satisfies the user's shape filter.
// `opts` shape: { diagonal: {enabled, mirror}, vertical: {...}, horizontal: {...} }.
// Falls back to the full pool if the filter excludes everything.
export function assignHousesForShapes(opts) {
  const o = opts || DEFAULT_SHAPE_OPTIONS
  let pool = ALL_ARRANGEMENTS.filter(({ shape, mirror }) => {
    const so = o[shape]
    if (!so || !so.enabled) return false
    if (mirror && !so.mirror) return false
    return true
  })
  if (pool.length === 0) pool = ALL_ARRANGEMENTS
  return pool[Math.floor(Math.random() * pool.length)].perm.slice()
}

// Return a representative seat→house arrangement for a given shape +
// mirror flag, used to render preview icons in the shape picker.
// House letters returned (A/B/C/D), not display names.
export function representativeArrangement(shape, mirror) {
  const match = ALL_ARRANGEMENTS.find(
    a => a.shape === shape && a.mirror === !!mirror
  )
  return match ? match.perm.map(h => HOUSE_TO_ID[h]) : null
}

// Random starting seat in [0, seatCount).
export function randomStart(seatCount) {
  return Math.floor(Math.random() * seatCount)
}

// Physical clockwise order around the 4-player table. In the 4-2t2b layout
// seats are: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right — so
// clockwise from TL goes TL → TR → BR → BL = 0 → 1 → 3 → 2.
export const CLOCKWISE_4P = [0, 1, 3, 2]

// True if any seat in `seats` is currently eliminated (isDead and not
// overridden) and assigned to the given house.
function isHouseEliminated(seats, house) {
  return seats.some(s => s && s.house === house && s.isDead && !s.deathOverridden)
}

// Returns the seat index of the unique Cycle winner — a player who is
// alive and whose feud + rival houses are both eliminated — or null if
// no one currently satisfies the condition. The cycle rules guarantee
// at most one such player at any time.
export function findCycleWinner(seats) {
  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i]
    if (!seat || !seat.house) continue
    if (seat.isDead && !seat.deathOverridden) continue
    const rel = cycleRelations(seat.house)
    if (!rel) continue
    if (isHouseEliminated(seats, rel.feud) && isHouseEliminated(seats, rel.rival)) {
      return i
    }
  }
  return null
}

// Turn position (1-indexed) of a seat relative to the starting seat,
// going clockwise around the physical table.
export function turnPositionFor(seatIndex, startingSeatIndex, seatCount) {
  if (seatCount === 4) {
    const startIdx = CLOCKWISE_4P.indexOf(startingSeatIndex)
    const seatIdx = CLOCKWISE_4P.indexOf(seatIndex)
    if (startIdx < 0 || seatIdx < 0) return null
    return ((seatIdx - startIdx + 4) % 4) + 1
  }
  return ((seatIndex - startingSeatIndex + seatCount) % seatCount) + 1
}
