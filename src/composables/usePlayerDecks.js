import { inject } from 'vue'

const LS_GUESTS = 'edhlog-lt-session-guests'

// Shared "which decks can this player pick" lookup, used by the edit
// surfaces (conclude / export) so a deck that wasn't switched during the
// game can be corrected. Mirrors DeckPicker's source of truth: registered
// decks owned by the player plus any session guest decks.
export function usePlayerDecks() {
  const data = inject('data', null)

  function loadGuests() {
    try {
      return JSON.parse(localStorage.getItem(LS_GUESTS) || '[]')
    } catch {
      return []
    }
  }

  function decksForPlayer(name) {
    if (!name) return []
    const registered = data?.value?.decks?.filter(d => d.owner === name) || []
    const guest = loadGuests().find(g => g.name === name)
    const guestDecks = guest?.decks || []
    return [...registered, ...guestDecks].map(d => ({
      name: d.name,
      colors: d.colors || '',
      isTemp: !!d.isTemp,
    }))
  }

  return { decksForPlayer }
}
