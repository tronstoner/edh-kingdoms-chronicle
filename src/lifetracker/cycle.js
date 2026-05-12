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
