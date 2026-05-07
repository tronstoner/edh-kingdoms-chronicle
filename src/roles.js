// Shared role config for both the lifetracker and dashboard.
// Single source of truth for colors, image URLs, and per-context labels.

export const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
  'Clone Lord': '#5ba3d9',
}

// Lord shares the Zombie Lord artwork (he _is_ the Zombie Lord by default);
// Clone Lord has its own art.
const ROLE_SLUG = {
  King: 'king',
  Knight: 'knight',
  Goblin: 'goblin',
  Lord: 'zombie-lord',
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
  King: 'Rules the kingdom with the loyal Knight at his side. The two share a single fate — they win together when the Lord falls last.',
  Knight: 'Sworn to the King. Wins when his liege survives, loses when the throne is overthrown. Together they form the Crown.',
  Goblin: 'Always part of a pair. Wild, chaotic, and unpredictable — Goblins win or lose as a team, never apart.',
  'Zombie Lord': 'Plays alone against the kingdom. Killed players rise as Zombies (20 life) and fight for him. Wins by killing the King last, or by leveling everyone at once. If the Lord falls, his Zombies fall with him.',
  'Clone Lord': 'A rare blue-tinged Lord variant. Killed players become Clones rather than Zombies, but the rules of life and death are the same — the Lord wins the room or perishes with his minions.',
}
