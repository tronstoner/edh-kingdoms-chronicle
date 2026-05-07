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
