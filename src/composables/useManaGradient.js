import { computed } from 'vue'

const GRADIENT_COLORS = {
  W: '#f7f4e6',
  U: '#0e68ab',
  B: '#211720',
  R: '#d3202a',
  G: '#00733e',
  C: '#a8a49a',
}

function sortForGradient(colorChars) {
  const mid = []
  let hasW = false
  let hasB = false
  for (const c of colorChars) {
    if (c === 'W') hasW = true
    else if (c === 'B') hasB = true
    else mid.push(c)
  }
  // W and B go to outer edges, chromatic colors in the middle
  const sorted = []
  if (hasW) sorted.push('W')
  sorted.push(...mid)
  if (hasB) sorted.push('B')
  return sorted
}

export function useManaGradient(colorsRef) {
  return computed(() => {
    const str = typeof colorsRef === 'function' ? colorsRef() : colorsRef?.value
    if (!str) return 'transparent'
    const sorted = sortForGradient(str.split('').filter(c => GRADIENT_COLORS[c]))
    const colors = sorted.map(c => GRADIENT_COLORS[c])
    if (colors.length === 0) return 'transparent'
    if (colors.length === 1) {
      const fade = sorted[0] === 'B' ? '#3a3030' : `${colors[0]}88`
      return `linear-gradient(135deg, ${colors[0]}, ${fade})`
    }
    const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1) * 100).toFixed(0)}%`)
    return `linear-gradient(135deg, ${stops.join(', ')})`
  })
}
