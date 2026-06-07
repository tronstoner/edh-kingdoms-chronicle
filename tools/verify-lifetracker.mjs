// Headless lifetracker screenshot verifier.
//
// Drives the dev server with the ?demo bypass in App.vue (which skips
// the Google sign-in flow) and captures the in-game table at multiple
// viewports. Used to confirm the panel scales correctly from iPad
// landscape down to phone portrait without losing the iPad look.
//
// Usage:
//   1. Make sure Playwright is installed. It is an optionalDependency
//      so `npm ci --omit=optional` (CI / prod builds) skips it. For
//      local verification run a plain `npm install` (or
//      `npm install playwright`) and `npx playwright install chromium`.
//   2. Start the dev server in another terminal: `npm run dev`
//   3. Run: `node tools/verify-lifetracker.mjs [--base http://localhost:5174/kingdoms]`
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
  { label: 'short-landscape-800x480', width: 800, height: 480, players: 6, cloneLord: true },
  { label: 'short-landscape-800x480-partners', width: 800, height: 480, players: 6, partnersOn: true },
  { label: 'phone-landscape', width: 844, height: 390 },
  { label: 'phone-landscape-partners', width: 844, height: 390, partnersOn: true },
  { label: 'phone-portrait', width: 390, height: 844 },
]

// Sample mid-game Kingdoms state. Mirrors the shape produced by
// useLifetrackerState.createGame so the lifetracker page resumes
// directly into the 'playing' phase.
// `opts.partnersOn`: set hasPartners=true on a couple of seats so the
//   commander-damage modal renders the dual-commander split layout.
// `opts.cloneLord`: assign Clone Lord (multi-word label) to the panel
//   whose modal we capture, to exercise the role-box overflow case.
function buildState(playerCount = 5, opts = {}) {
  const decks = [
    { name: 'Atraxa, Praetors’ Voice', colors: 'WUBG' },
    { name: 'Krenko, Mob Boss', colors: 'R' },
    { name: 'Edgar Markov', colors: 'WBR' },
    { name: 'Yuriko, the Tiger’s Shadow', colors: 'UB' },
    { name: 'Omnath, Locus of Creation', colors: 'WUBRG' },
    { name: 'The Ur-Dragon', colors: 'WUBRG' },
  ]
  const players = ['Aldrich', 'Brennan', 'Cyrus', 'Davian', 'Elara', 'Felix']
  const roles5 = ['King', 'Knight', 'Goblin', 'Goblin', 'Lord']
  const roles6 = ['King', 'Knight', 'Goblin', 'Goblin', 'Lord', 'Clone Lord']
  const roles = playerCount === 6 ? roles6 : roles5
  // Optional override: force the focused seat (index 3, bottom-left of
  // both 5-3t2b and 6-3t3b layouts) to Clone Lord so the verifier
  // exercises the multi-line label path.
  if (opts.cloneLord && roles[3]) roles[3] = 'Clone Lord'
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
  // Optional partner mode for a couple of seats so the modal renders
  // the dual-commander split.
  if (opts.partnersOn) {
    if (seats[1]) seats[1].hasPartners = true
    if (seats[4]) seats[4].hasPartners = true
    // Add some damage on the second commander to make the split visible.
    seats.forEach(s => {
      if (s.commanderDamage[1]) s.commanderDamage[1].cmd2 = 6
      if (s.commanderDamage[4]) s.commanderDamage[4].cmd2 = 3
    })
  }
  return {
    id: 'verify',
    mode: 'kingdoms',
    phase: 'playing',
    playerCount,
    layoutId: playerCount === 6 ? '6-3t3b' : '5-3t2b',
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
  }, buildState(viewport.players || 5, {
    partnersOn: !!viewport.partnersOn,
    cloneLord: !!viewport.cloneLord,
  }))

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

  // Capture with the commander damage modal open from a bottom-row seat
  // (Davian, index 3) so the modal sits in front of the table.
  await page.evaluate(() => {
    document.querySelectorAll('.player-panel')[3]?.querySelector('.cmd-minimap')?.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
  })
  // Use a real click on the minimap to be safe:
  const minimaps = await page.locator('.player-panel .cmd-minimap').all()
  if (minimaps[3]) await minimaps[3].click({ position: { x: 10, y: 10 } })
  try {
    await page.waitForSelector('.cmd-panel', { timeout: 2000 })
    await page.waitForTimeout(150)
    const outModal = resolve(OUT, `${viewport.label}-cmddmg.png`)
    await page.screenshot({ path: outModal, fullPage: false })
  } catch { /* modal didn't open */ }

  const sizes = await page.evaluate(() => {
    const pick = (n, sel) => {
      const el = n.querySelector(sel)
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { w: Math.round(rect.width), h: Math.round(rect.height), font: getComputedStyle(el).fontSize }
    }
    const panel = [...document.querySelectorAll('.player-panel')].slice(0, 1).map(p => ({
      panel: { w: p.clientWidth, h: p.clientHeight },
      lifeTotal: pick(p, '.life-total'),
      minimap: pick(p, '.cmd-minimap'),
      minimapCell: pick(p, '.minimap-cell'),
      roleTagImg: pick(p, '.role-tag-img'),
    }))[0]
    const menu = (() => {
      const m = document.querySelector('.menu-gap, .menu-column')
      if (!m) return null
      const turn = m.querySelector('.turn-btn')
      return { container: { w: m.clientWidth, h: m.clientHeight }, turnBtn: turn ? { w: turn.clientWidth, h: turn.clientHeight } : null }
    })()
    const cmd = (() => {
      const p = document.querySelector('.cmd-panel')
      if (!p) return null
      const counterBoxes = p.querySelectorAll('.counter-box')
      const counter0 = counterBoxes[0]
      return {
        panel: { w: p.clientWidth, h: p.clientHeight },
        counterBox: counter0 ? { w: counter0.clientWidth, h: counter0.clientHeight } : null,
        counterCount: counterBoxes.length,
        cmdSeatHeight: p.querySelector('.cmd-seat')?.clientHeight ?? null,
      }
    })()
    return { panel, menu, cmd }
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
