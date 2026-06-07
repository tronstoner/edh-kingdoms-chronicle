// Headless lifetracker screenshot verifier.
//
// Drives the dev server with the ?demo bypass in App.vue (which skips
// the Google sign-in flow) and captures the in-game table at multiple
// viewports. Used to confirm the panel scales correctly from iPad
// landscape down to phone portrait without losing the iPad look.
//
// Usage:
//   1. Start the dev server in another terminal: `npm run dev`
//   2. Run: `node tools/verify-lifetracker.mjs [--base http://localhost:5174/kingdoms]`
//
// Outputs PNGs to ./tools/verify-out/ and prints computed sizes for the
// life total, minimap, and minimap cell so regressions are catchable
// without eyeballing the screenshots.

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

const BASE = arg('base', 'http://localhost:5174/kingdoms').replace(/\/$/, '')
const ROUTE = `${BASE}/lifetracker?demo=1`

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, 'verify-out')
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { label: 'ipad-landscape', width: 1180, height: 820 },
  { label: 'ipad-mini-portrait', width: 768, height: 1024 },
  { label: 'phone-landscape', width: 844, height: 390 },
  { label: 'phone-portrait', width: 390, height: 844 },
]

// Sample mid-game 5-player Kingdoms state. Mirrors the shape produced
// by useLifetrackerState.createGame so the lifetracker page resumes
// directly into the 'playing' phase.
function buildState() {
  const playerCount = 5
  const decks = [
    { name: 'Atraxa, Praetors’ Voice', colors: 'WUBG' },
    { name: 'Krenko, Mob Boss', colors: 'R' },
    { name: 'Edgar Markov', colors: 'WBR' },
    { name: 'Yuriko, the Tiger’s Shadow', colors: 'UB' },
    { name: 'Omnath, Locus of Creation', colors: 'WUBRG' },
  ]
  const players = ['Aldrich', 'Brennan', 'Cyrus', 'Davian', 'Elara']
  const roles = ['King', 'Knight', 'Goblin', 'Goblin', 'Lord']
  const seats = []
  for (let i = 0; i < playerCount; i++) {
    const commanderDamage = {}
    for (let j = 0; j < playerCount; j++) commanderDamage[j] = { cmd1: 0, cmd2: 0 }
    if (i === 0) commanderDamage[2].cmd1 = 7
    if (i === 1) { commanderDamage[0].cmd1 = 12; commanderDamage[4].cmd1 = 4 }
    if (i === 4) commanderDamage[3].cmd1 = 18
    seats.push({
      index: i,
      player: players[i],
      deck: decks[i],
      role: roles[i],
      roleRevealed: true,
      house: null,
      life: [37, 28, 40, 22, 11][i],
      poison: i === 3 ? 4 : 0,
      poisonEnabled: i === 3,
      commanderTax: i === 0 ? 4 : 0,
      commanderDamage,
      hasPartners: false,
      isDead: false,
      deathOverridden: false,
      deathTurn: null,
      isWinner: false,
      roleNotes: i === 2 ? 'Zombie' : null,
      history: [],
    })
  }
  return {
    id: 'verify',
    mode: 'kingdoms',
    phase: 'playing',
    playerCount,
    layoutId: '5-3t2b',
    turnCount: 4,
    startTime: new Date(0).toISOString(),
    startingSeatIndex: 0,
    seats,
  }
}

async function capture(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))

  await page.addInitScript((state) => {
    localStorage.setItem('edhlog-lt-current', JSON.stringify(state))
  }, buildState())

  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })

  // Lifetracker shows a "Game in Progress / Resume?" modal when there's
  // a saved game. Auto-resume so we land in the playing phase.
  const resume = page.getByRole('button', { name: 'Resume' })
  try { await resume.click({ timeout: 1500 }) } catch { /* no resume prompt */ }

  try {
    await page.waitForSelector('.player-panel', { timeout: 10000 })
  } catch (e) {
    const body = await page.evaluate(() => document.body.innerText.slice(0, 600))
    console.log(`[${viewport.label}] DOM did not reach .player-panel. Body text:\n${body}`)
    if (errors.length) console.log(`  page errors: ${errors.join(' | ')}`)
    throw e
  }
  // Give Vue/transitions a frame to settle.
  await page.waitForTimeout(300)

  const out = resolve(OUT, `${viewport.label}.png`)
  await page.screenshot({ path: out, fullPage: false })

  const sizes = await page.evaluate(() => {
    const pick = (n, sel) => {
      const el = n.querySelector(sel)
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { w: Math.round(rect.width), h: Math.round(rect.height), font: getComputedStyle(el).fontSize }
    }
    return [...document.querySelectorAll('.player-panel')].slice(0, 1).map(p => ({
      panel: { w: p.clientWidth, h: p.clientHeight },
      lifeTotal: pick(p, '.life-total'),
      minimap: pick(p, '.cmd-minimap'),
      minimapCell: pick(p, '.minimap-cell'),
      roleTagImg: pick(p, '.role-tag-img'),
    }))[0]
  })

  await ctx.close()
  return { out, sizes, errors }
}

const browser = await chromium.launch()
try {
  for (const vp of VIEWPORTS) {
    const { out, sizes, errors } = await capture(browser, vp)
    console.log(`[${vp.label}] ${vp.width}×${vp.height} → ${out}`)
    console.log(`  sizes: ${JSON.stringify(sizes)}`)
    if (errors.length) console.log(`  page errors: ${errors.join(' | ')}`)
  }
} finally {
  await browser.close()
}
