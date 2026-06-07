export const LAYOUTS = {
  '4-2t2b': {
    id: '4-2t2b',
    playerCount: 4,
    label: '2 + 2',
    menuColumn: true,
    // Menu column shrinks with the viewport. iPad-landscape vmin is 820
    // so 8vmin = 65.6 → clamps to 64px (the iPad-tuned target). Phones
    // (vmin ~390) hit the 40px floor.
    gridTemplateColumns: '1fr clamp(40px, 8vmin, 64px) 1fr',
    menuGridColumn: 2,
    rows: [
      { seats: [0, 1], seatGridColumns: [1, 3], rotate: 180 },
      { seats: [2, 3], seatGridColumns: [1, 3], rotate: 0 },
    ],
  },
  '5-3t2b': {
    id: '5-3t2b',
    playerCount: 5,
    label: '3 + 2',
    rows: [
      { seats: [0, 1, 2], rotate: 180 },
      { seats: [3, 4], rotate: 0, menuGap: true },
    ],
  },
  '5-2t3b': {
    id: '5-2t3b',
    playerCount: 5,
    label: '2 + 3',
    rows: [
      { seats: [0, 1], rotate: 180, menuGap: true },
      { seats: [2, 3, 4], rotate: 0 },
    ],
  },
  '6-3t3b': {
    id: '6-3t3b',
    playerCount: 6,
    label: '3 + 3',
    menuColumn: true,
    gridTemplateColumns: '1fr 1fr clamp(40px, 8vmin, 64px) 1fr',
    menuGridColumn: 3,
    rows: [
      { seats: [0, 1, 2], seatGridColumns: [1, 2, 4], rotate: 180 },
      { seats: [3, 4, 5], seatGridColumns: [1, 2, 4], rotate: 0 },
    ],
  },
}

export function layoutsForCount(playerCount) {
  return Object.values(LAYOUTS).filter(l => l.playerCount === playerCount)
}

export function defaultLayout(playerCount) {
  if (playerCount === 4) return LAYOUTS['4-2t2b']
  if (playerCount === 6) return LAYOUTS['6-3t3b']
  return LAYOUTS['5-3t2b']
}
