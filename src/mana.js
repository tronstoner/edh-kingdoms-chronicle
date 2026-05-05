export const MANA_MAP = {
  W: { icon: 'ms ms-w', label: 'White' },
  U: { icon: 'ms ms-u', label: 'Blue' },
  B: { icon: 'ms ms-b', label: 'Black' },
  R: { icon: 'ms ms-r', label: 'Red' },
  G: { icon: 'ms ms-g', label: 'Green' },
  C: { icon: 'ms ms-c', label: 'Colorless' },
}

export function colorIcons(colorStr) {
  if (!colorStr) return []
  return colorStr.split('').map(c => MANA_MAP[c]).filter(Boolean)
}
