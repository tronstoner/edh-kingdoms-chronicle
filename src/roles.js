// Shared role config for both the lifetracker and dashboard.
// Single source of truth for colors, image URLs, and per-context labels.

// 'Lord' is the canonical role key used in game data; 'Zombie Lord' is the same role,
// just under its full name (used in display contexts where Clone Lord stands separately).
export const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
  'Zombie Lord': '#a47be0',
  'Clone Lord': '#5ba3d9',
}

const ROLE_SLUG = {
  King: 'king',
  Knight: 'knight',
  Goblin: 'goblin',
  Lord: 'zombie-lord',
  'Zombie Lord': 'zombie-lord',
  'Clone Lord': 'clone-lord',
}

// BASE_URL ends with '/' (Vite normalises it). Built assets sit under it on deploy.
const BASE = import.meta.env.BASE_URL

export function roleIconUrl(role) {
  const slug = ROLE_SLUG[role]
  return slug ? `${BASE}role-icons/${slug}.png` : null
}

export function rolePortraitUrl(role) {
  const slug = ROLE_SLUG[role]
  return slug ? `${BASE}roles/${slug}.png` : null
}

// In the lifetracker we display "Zombie Lord" rather than the bare "Lord".
// On the dashboard we keep "Lord" (it covers both Zombie & Clone variants).
export function lifetrackerRoleLabel(role) {
  return role === 'Lord' ? 'Zombie Lord' : role
}

// Conversion badges (Zombie/Clone) reuse the corresponding Lord's icon.
export function conversionIconUrl(noteRole) {
  if (noteRole === 'Zombie') return roleIconUrl('Lord')
  if (noteRole === 'Clone') return roleIconUrl('Clone Lord')
  return null
}

export const ROLE_DESCRIPTIONS = {
  King: 'Rules with the Knight at his side. Wins whenever his enemies fall — even if the Knight has died. If the Knight closes out the game with an alternate win condition, the King shares the victory.',
  Knight: 'Sworn to the King. Shares the King\'s fate: the Crown wins together when the others fall, by combat or by alternate win condition.',
  Goblin: 'Wild and chaotic, always part of a pair. The Goblins win the instant the King dies — provided at least one of them is still standing.',
  'Zombie Lord': 'Plays alone against the kingdom. Wins only by killing the King last, by leveling everyone at once, or via an alternate win condition. Players he kills rise as Zombies (20 life) and fight for him — but the moment the Lord falls, every Zombie falls with him.',
  'Clone Lord': 'A rare blue-tinged Lord variant. The win conditions are identical to the Zombie Lord — King last, everyone at once, or an alternate win — but his fallen rise as Clones rather than Zombies. They live and die with him.',
}
