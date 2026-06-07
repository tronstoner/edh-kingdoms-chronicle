# Agents

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

EDH Kingdoms Chronicle — a Vue 3 SPA that displays analytics for Magic: The Gathering Commander games using the Kingdoms variant. Data is fetched live from a private Google Sheet via OAuth.

## Repository Structure

```
src/
  App.vue               # Root shell — auth flow, header, provides data to routes
                        # (?demo bypass on dev builds skips Google sign-in)
  main.js               # Vue app entry point (mounts router)
  router.js             # Vue Router — dashboard, player profiles, lifetracker
  data.js               # Google Sheets API fetch + data parsing + hyperlink extraction
  analysis.js           # Derived stats: role distribution, streaks, nemesis, partners, deck diversity
  google-auth.js        # Google OAuth (Identity Services) with session persistence
  mana.js               # Mana symbol helpers (WUBRG color icons)
  roles.js              # Kingdoms role metadata, icon URLs, conversion icons
  style.css             # TailwindCSS v4 + custom MTG theme tokens + font imports
  lifetracker/
    cycle.js            # The Cycle (4-player) — house assignment, kill-list math, shapes
  composables/
    useLifetrackerState.js  # Game state, settings, advanceTurn, persistence, turnNudgeThresholdMs
    useTableLayouts.js  # LAYOUTS map (4-2t2b, 5-3t2b, 5-2t3b, 6-3t3b) + responsive menu gap
    useLifeCounter.js   # Long-press / drag life-counter input
    useManaGradient.js  # Deck-color gradient generator for panels
    useFullscreen.js    # Fullscreen API wrapper
    useNowTick.js       # Reactive `now` ref ticking at a configurable interval
  pages/
    Dashboard.vue       # Main dashboard with all overview charts
    PlayerProfile.vue   # Individual player page with detailed stats
    Splash.vue          # Landing screen
    Lifetracker.vue     # Real-time game tracker (setup → cycle-preview → playing → conclude)
  components/
    ChartCard.vue       # Shared card wrapper for all sections
    PlayerStats.vue     # Player win/loss table + stacked bar chart (names link to profiles)
    PlayerRoleHeatmap.vue  # Win rate grid: players x roles
    RoleBalance.vue     # Role win rates + Kingdoms rules explanation
    ColorStats.vue      # WUBRG color performance + color combo analysis
    DeckStats.vue       # Filterable/sortable deck performance with mana pips + Moxfield links
    GameTimeline.vue    # Cumulative wins line chart over time
    RecentGames.vue     # Reverse-chronological game log
    RoleDetailModal.vue # Role-specific drill-down
    lifetracker/
      TableLayout.vue        # 5/6-player table grid + menu gap/column
      PlayerPanel.vue        # Per-seat panel (life, role tag, minimap, gradient bg)
      LifeCounter.vue        # Tap zones overlay (+/- with hold-to-repeat)
      GameMenuInline.vue     # Turn-cycle button (fuse + radial), battle menu, fullscreen
      DeathBanner.vue        # Override / Zombify / Clone / Reveal role buttons
      CommanderDamageModal.vue  # Per-player damage breakdown with partner support
      RolePicker.vue         # Reveal-role overlay (Kingdoms)
      DeckPicker.vue         # Player + deck selection (mid-game seat edit)
      ConfirmDialog.vue      # Generic confirm overlay (rotated per seat)
      SettingsModal.vue      # Session settings (turn-nudge enable + min/player cap)
      ConcludeModal.vue      # Save + export the finished game
      ExportModal.vue        # Session export / clear stored games
      Announcement.vue       # Turn / winner banners
      CycleHouseBadge.vue    # The Cycle sigil + kill-list plate
      CycleDirectionsMap.vue # Cycle kill-list overlay map
      CycleRelationIcon.vue  # Crossed swords / sword / shield SVGs
      CycleSetupPreview.vue  # House deal + starting player reveal
tools/
  verify-lifetracker.mjs   # Playwright snapshot verifier (optionalDep, see Conventions)
index.html
vite.config.js
.env.example            # Required env vars (Google OAuth + Sheet IDs)
```

## Build & Dev Commands

```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server (default port 5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build locally
```

## Key Technical Decisions

- **Vue Router** — client-side routing for dashboard (`/`), player profiles (`/player/:name`), and lifetracker (`/lifetracker`). Data is loaded once in App.vue and provided via `provide/inject`.
- **Google Sheets API v4 with browser OAuth** — no backend needed. Users sign in with Google, the app reads sheets directly. Token persisted in `sessionStorage` to survive page reloads.
- **Hyperlink extraction** — deck Moxfield URLs are embedded as hyperlinks in the spreadsheet. Fetched via the `spreadsheets.get` endpoint with `fields=sheets.data.rowData.values(hyperlink,formattedValue)`.
- **`valueRenderOption=UNFORMATTED_VALUE`** — critical: the Sheets API must return raw numbers, not formatted strings, otherwise percentage values get double-multiplied.
- **TailwindCSS v4** with `@theme` block for custom design tokens (MTG color palette).
- **Chart.js via vue-chartjs** — all charts use the Cinzel/EB Garamond fonts and the MTG color scheme.
- **Mana font** (`mana-font` npm package) — MIT/OFL licensed icon font for WUBRG symbols.
- **Container-query responsive sizing in the lifetracker** — `PlayerPanel`, `CommanderDamageModal` panel, `.counter-box`, and `.cmd-seat` are all `container-type: size` contexts. Children use `cqmin` / `cqi` / `cqh` percentages tuned against iPad reference dimensions so the iPad look-and-feel is preserved exactly while smaller viewports scale down proportionally. See LIFETRACKER-DESIGN.md for details.
- **Dev-only `?demo` bypass in App.vue** — when `import.meta.env.DEV` and the URL has `?demo`, skip Google sign-in and stub `data` so the lifetracker route opens directly. Used by `tools/verify-lifetracker.mjs` for headless screenshot verification; tree-shaken from production builds.

## Kingdoms Variant Rules

Understanding the game format is important for correct data interpretation:

- **5 players**: King, Knight, 2 Goblins, Lord (Zombie Lord)
- **6 players**: adds a Clone Lord
- **Goblins are a team** — they always win or lose together. Both get a "Win" in the data.
- **Lord** plays alone. Killed players become Zombies/Clones (20 life, fight for the Lord). Lord wins by killing the King last (or everyone at once). If the Lord dies, all minions die too.
- The `First KO` column tracks suicides. The `Role Notes` column tracks zombie/clone conversions ("Zombie", "Clone") and role variants ("Clone Lord").
- **Team partner analysis** detects Goblin pairs and King/Knight pairings from the game log.

## Role Color System

Roles are randomly assigned using MTG basic lands, so each role maps to a land color:

| Role | Land | Color | Hex | Notes |
|------|------|-------|-----|-------|
| King | Plains (White) | Golden | `#e2b84a` | Crown theme, fits White's identity |
| Knight | Forest (Green) | Green | `#6ab86a` | |
| Goblin | Mountain (Red) | Red | `#d95555` | Always a team of 2 |
| Zombie Lord | Swamp (Black) | Purple | `#a47be0` | Default "Lord" color in all contexts |
| Clone Lord | Island (Blue) | Blue | `#5ba3d9` | Rare; uses default Lord purple in most UI |

These are defined as CSS custom properties (`--color-role-*`) in `style.css`. Zombie/Clone conversion markers in the UI use neutral colors (not role colors) since they represent a state change, not a role.

## Design References

- [LIFETRACKER-DESIGN.md](LIFETRACKER-DESIGN.md) — Table orientation, modal rotation, and minimap rules for the lifetracker UI.

## Conventions

- No global pip/npm installs — use `uv venv` for Python, project-local `node_modules` for JS.
- Never run `git push` — only the user pushes.
- Commit messages should not include `Co-Authored-By` lines.
- **Playwright is an optionalDependency.** Only the headless verifier in `tools/` needs it; CI / production installs run `npm ci --omit=optional`. For local verification run a plain `npm install` then `npx playwright install chromium`.
- **When to run the verifier:** for layout-shaped changes (overflow, sizing, responsive break-points) — that's its purpose. Skip it for animations / interactions / state-machine logic; a static screenshot doesn't reveal those and the cost (boot Chromium, navigate, multiple viewports) is real.
