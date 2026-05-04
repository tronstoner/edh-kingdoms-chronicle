import { getAccessToken } from './google-auth.js'

const SPREADSHEET_ID = import.meta.env.VITE_SHEET_ID || ''

async function fetchSheet(sheetName) {
  const token = getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}?valueRenderOption=UNFORMATTED_VALUE`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch "${sheetName}": ${res.status} ${text}`)
  }
  const json = await res.json()
  const [headers, ...rows] = json.values || []
  return rows.map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })
}

function num(v) {
  if (v === '' || v === undefined || v === null) return null
  if (typeof v === 'number') return v
  const n = Number(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}

function str(v) {
  if (v === '' || v === undefined || v === null) return ''
  return String(v).trim()
}

function parseGames(rows) {
  const games = []
  let current = null

  for (const row of rows) {
    const date = str(row['Date'])
    const player = str(row['Player'])
    if (!player) continue

    if (date) {
      current = { date, players: [] }
      games.push(current)
    }
    if (current) {
      current.players.push({
        player,
        deck: str(row['Deck']) || null,
        role: str(row['Role']) || null,
        result: str(row['Result']) || null,
        firstKO: str(row['First KO']) || null,
      })
    }
  }
  return games
}

function parsePlayers(rows) {
  return rows
    .filter(r => str(r['Player']))
    .map(r => ({
      name: str(r['Player']),
      games: num(r['Games']),
      wins: num(r['Wins']),
      losses: num(r['Losses']),
      winRate: num(r['Win Rate']),
      kingGames: num(r['King Games']),
      kingWinRate: num(r['King Win Rate']),
      knightGames: num(r['# Knight Games']),
      knightWinRate: num(r['Knight Win Rate']),
      goblinGames: num(r['# Goblin Games']),
      goblinWinRate: num(r['Goblin Win Rate']),
      lordGames: num(r['Lord Games']),
      lordWinRate: num(r['Lord Win Rate']),
    }))
}

function parseDecks(rows) {
  return rows
    .filter(r => str(r['Deck']) && num(r['Games']) > 0)
    .map(r => ({
      name: str(r['Deck']),
      colors: str(r['Colors']),
      owner: str(r['Owner']),
      budget: num(r['Budget']),
      games: num(r['Games']),
      wins: num(r['Wins']),
      losses: num(r['Losses']),
      winRate: num(r['Win Rate']),
      kingGames: num(r['King Games']),
      kingWinRate: num(r['King Win Rate']),
      knightGames: num(r['# Knight Games']),
      knightWinRate: num(r['Knight Win Rate']),
      goblinGames: num(r['# Goblin Games']),
      goblinWinRate: num(r['Goblin Win Rate']),
      lordGames: num(r['Lord Games']),
      lordWinRate: num(r['Lord Win Rate']),
    }))
}

function parseRoles(rows) {
  return rows
    .filter(r => str(r['Role']))
    .map(r => ({
      name: str(r['Role']),
      wins: num(r['Wins']),
      losses: num(r['Losses']),
      winRate: num(r['Win Rate']),
    }))
}

export async function fetchAllData() {
  if (!SPREADSHEET_ID) {
    throw new Error('Set VITE_SHEET_ID in .env')
  }

  const [kingdomsRaw, playersRaw, decksRaw, rolesRaw] = await Promise.all([
    fetchSheet('Kingdoms'),
    fetchSheet('Players'),
    fetchSheet('Decks'),
    fetchSheet('Roles'),
  ])

  return {
    games: parseGames(kingdomsRaw),
    players: parsePlayers(playersRaw),
    decks: parseDecks(decksRaw),
    roles: parseRoles(rolesRaw),
  }
}
