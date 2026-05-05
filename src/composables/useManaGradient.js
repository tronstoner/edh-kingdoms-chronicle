import { computed } from 'vue'

const GRADIENT_COLORS = {
  W: '#f9faf4',
  U: '#0e68ab',
  B: '#3d2b4f',
  R: '#d3202a',
  G: '#00733e',
}

export function useManaGradient(colorsRef) {
  return computed(() => {
    const str = typeof colorsRef === 'function' ? colorsRef() : colorsRef?.value
    if (!str) return 'transparent'
    const colors = str.split('').map(c => GRADIENT_COLORS[c]).filter(Boolean)
    if (colors.length === 0) return 'transparent'
    if (colors.length === 1) return colors[0]
    const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1) * 100).toFixed(0)}%`)
    return `linear-gradient(135deg, ${stops.join(', ')})`
  })
}
