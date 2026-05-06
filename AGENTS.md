# Agents

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

EDH Kingdoms Chronicle — a Vue 3 SPA that displays analytics for Magic: The Gathering Commander games using the Kingdoms variant. Data is fetched live from a private Google Sheet via OAuth.

## Repository Structure

```
src/
  App.vue               # Root shell — auth flow, header, provides data to routes
  main.js               # Vue app entry point (mounts router)
  router.js             # Vue Router — dashboard + player profile routes
  data.js               # Google Sheets API fetch + data parsing + hyperlink extraction
  analysis.js           # Derived stats: role distribution, streaks, nemesis, partners, deck diversity
  google-auth.js        # Google OAuth (Identity Services) with session persistence
  mana.js               # Mana symbol helpers (WUBRG color icons)
  style.css             # TailwindCSS v4 + custom MTG theme tokens + font imports
  pages/
    Dashboard.vue       # Main dashboard with all overview charts
    PlayerProfile.vue   # Individual player page with detailed stats
  components/
    ChartCard.vue       # Shared card wrapper for all sections
    PlayerStats.vue     # Player win/loss table + stacked bar chart (names link to profiles)
    PlayerRoleHeatmap.vue  # Win rate grid: players x roles
    RoleBalance.vue     # Role win rates + Kingdoms rules explanation
    ColorStats.vue      # WUBRG color performance + color combo analysis
    DeckStats.vue       # Filterable/sortable deck performance with mana pips + Moxfield links
    GameTimeline.vue    # Cumulative wins line chart over time
    RecentGames.vue     # Reverse-chronological game log
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

- **Vue Router** — client-side routing for dashboard (`/`) and player profiles (`/player/:name`). Data is loaded once in App.vue and provided via `provide/inject`.
- **Google Sheets API v4 with browser OAuth** — no backend needed. Users sign in with Google, the app reads sheets directly. Token persisted in `sessionStorage` to survive page reloads.
- **Hyperlink extraction** — deck Moxfield URLs are embedded as hyperlinks in the spreadsheet. Fetched via the `spreadsheets.get` endpoint with `fields=sheets.data.rowData.values(hyperlink,formattedValue)`.
- **`valueRenderOption=UNFORMATTED_VALUE`** — critical: the Sheets API must return raw numbers, not formatted strings, otherwise percentage values get double-multiplied.
- **TailwindCSS v4** with `@theme` block for custom design tokens (MTG color palette).
- **Chart.js via vue-chartjs** — all charts use the Cinzel/EB Garamond fonts and the MTG color scheme.
- **Mana font** (`mana-font` npm package) — MIT/OFL licensed icon font for WUBRG symbols.

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
