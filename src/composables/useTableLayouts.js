export const LAYOUTS = {
  '5-3t2b': {
    id: '5-3t2b',
    playerCount: 5,
    label: '3 + 2',
    rows: [
      { seats: [0, 1, 2], rotate: 180 },
      { seats: [3, 4], rotate: 0 },
    ],
  },
  '5-2t3b': {
    id: '5-2t3b',
    playerCount: 5,
    label: '2 + 3',
    rows: [
      { seats: [0, 1], rotate: 180 },
      { seats: [2, 3, 4], rotate: 0 },
    ],
  },
  '6-3t3b': {
    id: '6-3t3b',
    playerCount: 6,
    label: '3 + 3',
    rows: [
      { seats: [0, 1, 2], rotate: 180 },
      { seats: [3, 4, 5], rotate: 0 },
    ],
  },
}

export function layoutsForCount(playerCount) {
  return Object.values(LAYOUTS).filter(l => l.playerCount === playerCount)
}

export function defaultLayout(playerCount) {
  return playerCount === 6 ? LAYOUTS['6-3t3b'] : LAYOUTS['5-3t2b']
}
