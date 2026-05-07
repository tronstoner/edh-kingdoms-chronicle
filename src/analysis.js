/**
 * Compute per-player stats derived from the raw game log.
 */

export function computeRoleDistribution(games, playerName) {
  const dist = { King: 0, Knight: 0, Goblin: 0, Lord: 0 }
  let total = 0
  for (const game of games) {
    const entry = game.players.find(p => p.player === playerName)
    if (!entry || !entry.role) continue
    // Normalize — Clone Lord counts as Lord
    const role = entry.role === 'Clone Lord' ? 'Lord' : entry.role
    if (dist[role] !== undefined) dist[role]++
    total++
  }
  return Object.entries(dist).map(([role, count]) => ({
    role,
    count,
    pct: total > 0 ? count / total : 0,
  })).sort((a, b) => b.count - a.count)
}

export function computeDeckDiversity(games, playerName) {
  const deckStats = {}
  for (const game of games) {
    const entry = game.players.find(p => p.player === playerName)
    if (!entry || !entry.deck) continue
    if (!deckStats[entry.deck]) {
      deckStats[entry.deck] = { name: entry.deck, games: 0, wins: 0 }
    }
    deckStats[entry.deck].games++
    if (entry.result === 'Win') deckStats[entry.deck].wins++
  }
  const decks = Object.values(deckStats).sort((a, b) => b.games - a.games)
  return {
    totalDecks: decks.length,
    decks,
  }
}

export function computeNemesis(games, playerName) {
  const opponents = {}
  for (const game of games) {
    const me = game.players.find(p => p.player === playerName)
    if (!me) continue
    const iWon = me.result === 'Win'
    for (const p of game.players) {
      if (p.player === playerName) continue
      if (!opponents[p.player]) {
        opponents[p.player] = { name: p.player, gamesShared: 0, myWins: 0, theirWins: 0 }
      }
      opponents[p.player].gamesShared++
      if (iWon) opponents[p.player].myWins++
      if (p.result === 'Win') opponents[p.player].theirWins++
    }
  }
  const list = Object.values(opponents).filter(o => o.gamesShared >= 3)

  // Nemesis: opponent with highest win rate when we're both in the game
  const nemesis = [...list].sort((a, b) => {
    const aRate = a.theirWins / a.gamesShared
    const bRate = b.theirWins / b.gamesShared
    return bRate - aRate
  })[0] || null

  return { opponents: list, nemesis }
}

export function computeBestPartner(games, playerName) {
  const partners = {}

  for (const game of games) {
    const me = game.players.find(p => p.player === playerName)
    if (!me || !me.role) continue
    const iWon = me.result === 'Win'

    for (const p of game.players) {
      if (p.player === playerName || !p.role) continue

      // Detect teammates:
      // - Both Goblins
      // - I'm King and they're Knight (or vice versa)
      const isTeammate =
        (me.role === 'Goblin' && p.role === 'Goblin') ||
        (me.role === 'King' && p.role === 'Knight') ||
        (me.role === 'Knight' && p.role === 'King')

      if (!isTeammate) continue

      if (!partners[p.player]) {
        partners[p.player] = { name: p.player, games: 0, wins: 0, asGoblin: 0, asKingKnight: 0 }
      }
      partners[p.player].games++
      if (iWon) partners[p.player].wins++
      if (me.role === 'Goblin') partners[p.player].asGoblin++
      else partners[p.player].asKingKnight++
    }
  }

  const list = Object.values(partners)
    .map(p => ({ ...p, winRate: p.games > 0 ? p.wins / p.games : 0 }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)

  const best = list[0] || null
  const worst = list.length > 1
    ? [...list].filter(p => p.games >= 2).sort((a, b) => a.winRate - b.winRate || a.wins - b.wins)[0] || null
    : null
  return { partners: list, best, worst }
}

export function computeStreaks(games, playerName) {
  let current = 0
  let longest = 0
  let currentType = null
  const results = []

  for (const game of games) {
    const entry = game.players.find(p => p.player === playerName)
    if (!entry || !entry.result) continue
    const won = entry.result === 'Win'
    results.push({ date: game.date, won })

    if (won === currentType) {
      current++
    } else {
      current = 1
      currentType = won
    }
    if (won && current > longest) longest = current
  }

  // Last 10 form
  const last10 = results.slice(-10)
  const last10Wins = last10.filter(r => r.won).length

  return {
    longestWinStreak: longest,
    currentStreak: current,
    currentStreakType: currentType ? 'W' : 'L',
    last10Wins,
    last10Total: last10.length,
  }
}

export function computeZombieStats(games, playerName) {
  let timesZombified = 0
  let timesCloned = 0
  let playersRaised = 0

  for (const game of games) {
    const me = game.players.find(p => p.player === playerName)
    if (!me) continue

    const notes = (me.roleNotes || me.firstKO || '').trim()

    // Was I turned into a zombie/clone? Exact match — "Clone Lord" is a role, not a conversion
    if (notes === 'Zombie') timesZombified++
    if (notes === 'Clone') timesCloned++

    // Did I raise others? Lord makes Zombies, Clone Lord makes Clones
    if (me.role === 'Lord' || me.role === 'Clone Lord') {
      for (const p of game.players) {
        if (p.player === playerName) continue
        const pNotes = (p.roleNotes || p.firstKO || '').trim()
        if (pNotes === 'Zombie' || pNotes === 'Clone') playersRaised++
      }
    }
  }

  return {
    timesZombified,
    timesCloned,
    timesUndead: timesZombified + timesCloned,
    playersRaised,
  }
}

export function computeLordRecruitAnalysis(games) {
  const byRole = {} // role -> { recruited, lordWins, lordLosses }

  for (const game of games) {
    const lord = game.players.find(p => p.role === 'Lord' || p.role === 'Clone Lord')
    if (!lord) continue

    const minions = game.players.filter(p => {
      if (p.player === lord.player) return false
      const notes = (p.roleNotes || p.firstKO || '').trim()
      return notes === 'Zombie' || notes === 'Clone'
    })

    if (minions.length === 0) continue

    const lordWon = lord.result === 'Win'

    for (const m of minions) {
      const role = m.role || 'Unknown'
      if (!byRole[role]) byRole[role] = { role, recruited: 0, lordWins: 0, lordLosses: 0 }
      byRole[role].recruited++
      if (lordWon) byRole[role].lordWins++
      else byRole[role].lordLosses++
    }
  }

  return Object.values(byRole)
    .map(r => ({ ...r, lordWinRate: r.recruited > 0 ? r.lordWins / r.recruited : 0 }))
    .sort((a, b) => b.recruited - a.recruited)
}

export function computePlayerGames(games, playerName) {
  return games.filter(g => g.players.some(p => p.player === playerName))
}
