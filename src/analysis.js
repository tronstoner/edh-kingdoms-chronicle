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

export function computePlayerRoleOverTime(games, playerName, windowSize = 10) {
  const normalize = r => r === 'Clone Lord' ? 'Lord' : r
  const playerGames = games.filter(g => g.players.some(p => p.player === playerName))

  return playerGames.map((game, i) => {
    const win = playerGames.slice(Math.max(0, i - windowSize + 1), i + 1)
    const counts = { King: 0, Knight: 0, Goblin: 0, Lord: 0 }
    for (const g of win) {
      const entry = g.players.find(p => p.player === playerName)
      if (entry?.role) {
        const role = normalize(entry.role)
        if (counts[role] !== undefined) counts[role]++
      }
    }
    const total = win.length
    return {
      x: i + 1,
      date: game.date,
      King: total ? parseFloat(((counts.King / total) * 100).toFixed(1)) : 0,
      Knight: total ? parseFloat(((counts.Knight / total) * 100).toFixed(1)) : 0,
      Goblin: total ? parseFloat(((counts.Goblin / total) * 100).toFixed(1)) : 0,
      Lord: total ? parseFloat(((counts.Lord / total) * 100).toFixed(1)) : 0,
    }
  })
}

export function computeFactionWinShareCurves(games, windowSize = 10) {
  const normalize = r => r === 'Clone Lord' ? 'Lord' : r

  return games.map((_, i) => {
    const win = games.slice(Math.max(0, i - windowSize + 1), i + 1)
    let kkWins = 0, goblinWins = 0, lordWins = 0

    for (const game of win) {
      const king   = game.players.find(p => p.role === 'King')
      const goblin = game.players.find(p => p.role === 'Goblin')
      const lord   = game.players.find(p => normalize(p.role) === 'Lord')
      if      (king?.result   === 'Win') kkWins++
      else if (goblin?.result === 'Win') goblinWins++
      else if (lord?.result   === 'Win') lordWins++
    }

    const total = kkWins + goblinWins + lordWins
    const pct = v => total > 0 ? parseFloat(((v / total) * 100).toFixed(1)) : 0
    const kkPct = pct(kkWins)

    return {
      x: i + 1,
      date: games[i].date,
      Lord:   pct(lordWins),
      Goblin: pct(goblinWins),
      Knight: parseFloat((kkPct / 2).toFixed(1)),
      King:   parseFloat((kkPct / 2).toFixed(1)),
    }
  })
}

export function computeRoleWinLossCurves(games) {
  const roles = ['King', 'Knight', 'Goblin', 'Lord']
  const running = { King: 0, Knight: 0, Goblin: 0, Lord: 0 }
  const wins = { King: 0, Knight: 0, Goblin: 0, Lord: 0 }
  const counts = { King: 0, Knight: 0, Goblin: 0, Lord: 0 }
  const curves = { King: [], Knight: [], Goblin: [], Lord: [] }
  const normalize = r => r === 'Clone Lord' ? 'Lord' : r

  for (let i = 0; i < games.length; i++) {
    const game = games[i]
    for (const role of roles) {
      const entries = game.players.filter(p => normalize(p.role) === role)
      if (entries.length > 0) {
        const won = entries[0].result === 'Win'
        counts[role]++
        if (won) wins[role]++
        running[role] += won ? 1 : -1
      }
      curves[role].push({
        x: i + 1,
        y: running[role],
        rate: counts[role] > 0 ? parseFloat(((wins[role] / counts[role]) * 100).toFixed(1)) : null,
        date: game.date,
      })
    }
  }
  return curves
}

export function computeWinLossCurve(games, { playerName, deckName } = {}) {
  const relevant = games.filter(g =>
    g.players.some(p =>
      (!playerName || p.player === playerName) &&
      (!deckName || p.deck === deckName)
    )
  )
  let delta = 0
  let wins = 0
  return relevant.map((game, i) => {
    const entry = game.players.find(p =>
      (!playerName || p.player === playerName) &&
      (!deckName || p.deck === deckName)
    )
    const won = entry?.result === 'Win'
    if (won) wins++
    delta += won ? 1 : -1
    return { x: i + 1, y: delta, rate: parseFloat(((wins / (i + 1)) * 100).toFixed(1)), date: game.date }
  })
}
