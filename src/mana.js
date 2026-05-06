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

// 2-color guilds (sorted color keys)
const GUILD_MAP = {
  WU: 'ms ms-guild-azorius',
  WB: 'ms ms-guild-orzhov',
  WR: 'ms ms-guild-boros',
  WG: 'ms ms-guild-selesnya',
  UB: 'ms ms-guild-dimir',
  UR: 'ms ms-guild-izzet',
  UG: 'ms ms-guild-simic',
  BR: 'ms ms-guild-rakdos',
  BG: 'ms ms-guild-golgari',
  RG: 'ms ms-guild-gruul',
}

// 3-color: wedge clans + shard families
const TRICOLOR_MAP = {
  // Wedges (Khans clans)
  WUR: 'ms ms-clan-jeskai',
  WBR: 'ms ms-clan-mardu',
  WBG: 'ms ms-clan-abzan',
  UBG: 'ms ms-clan-sultai',
  URG: 'ms ms-clan-temur',
  // Shards (Streets of New Capenna families)
  WUB: 'ms ms-watermark-obscura',
  WUG: 'ms ms-watermark-brokers',
  WRG: 'ms ms-watermark-cabaretti',
  UBR: 'ms ms-watermark-maestros',
  BRG: 'ms ms-watermark-riveteers',
}

function sortColors(colorStr) {
  const order = 'WUBRGC'
  return colorStr.split('').sort((a, b) => order.indexOf(a) - order.indexOf(b)).join('')
}

export function factionIcon(colorStr) {
  if (!colorStr) return null
  const sorted = sortColors(colorStr)
  const len = sorted.length
  if (len === 1) return MANA_MAP[sorted]?.icon || null
  if (len === 2) return GUILD_MAP[sorted] || 'ms ms-chaos'
  if (len === 3) return TRICOLOR_MAP[sorted] || null
  if (len >= 4) return 'ms ms-chaos'
  return null
}
