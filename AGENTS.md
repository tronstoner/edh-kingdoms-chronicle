# Agents

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

EDH Kingdoms Log — a Vue 3 SPA that displays analytics for Magic: The Gathering Commander games using the Kingdoms variant. Data is fetched live from a private Google Sheet via OAuth.

## Repository Structure

```
src/
  App.vue               # Root component — auth flow, layout, data loading
  data.js               # Google Sheets API fetch + data parsing
  google-auth.js        # Google OAuth (Identity Services) with session persistence
  mana.js               # Mana symbol helpers (WUBRG color icons)
  style.css             # TailwindCSS v4 + custom MTG theme tokens + font imports
  main.js               # Vue app entry point
  components/
    ChartCard.vue       # Shared card wrapper for all sections
    PlayerStats.vue     # Player win/loss table + stacked bar chart
    PlayerRoleHeatmap.vue  # Win rate grid: players x roles
    RoleBalance.vue     # Role win rates + Kingdoms rules explanation
    ColorStats.vue      # WUBRG color performance + color combo analysis
    DeckStats.vue       # Filterable/sortable deck performance with mana pips
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

- **Google Sheets API v4 with browser OAuth** — no backend needed. Users sign in with Google, the app reads sheets directly. Token persisted in `sessionStorage` to survive page reloads.
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
- The `First KO` column tracks zombie/clone conversions and suicides.

## Conventions

- No global pip/npm installs — use `uv venv` for Python, project-local `node_modules` for JS.
- Never run `git push` — only the user pushes.
- Commit messages should not include `Co-Authored-By` lines.
