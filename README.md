# EDH Kingdoms Log

Analytics dashboard for tracking Magic: The Gathering games using the **Kingdoms** variant (similar to Bang!, 5-6 players).

## Features

- **Live data from Google Sheets** — authenticates via Google OAuth and reads game data directly from a shared spreadsheet
- **Player statistics** — win/loss records, win rates, per-role performance heatmap
- **Role balance analysis** — King, Knight, Goblin (team of 2), Lord (Zombie/Clone) win rates with rules explanation
- **Color performance** — WUBRG stats with mana symbols, color combination breakdowns
- **Deck stats** — filterable/sortable deck performance with mana color pips
- **Cumulative win timeline** — line chart tracking player victories over time
- **Recent games** — detailed game log with role badges and zombie/clone conversion markers
- **MTG-themed UI** — Cinzel font, mana symbols (Andrew Gioia's Mana font), dark parchment palette

## Tech Stack

- Vue 3 (Composition API, `<script setup>`)
- Vite
- TailwindCSS v4
- Chart.js + vue-chartjs
- Google Sheets API v4 + Google Identity Services (browser OAuth)
- Mana font (MIT/OFL licensed)

## Setup

### 1. Google Cloud credentials

1. Create a project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Google Sheets API**
3. Set up an **OAuth consent screen** (External, add your group as test users)
4. Create an **OAuth client ID** (Web application)
   - Add `http://localhost:5173` to Authorized JavaScript origins
   - Add your production domain if deploying

### 2. Spreadsheet

The spreadsheet must have these tabs: **Kingdoms**, **Decks**, **Players**, **Roles**.

Get the spreadsheet ID from the URL:
```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
```

Get each tab's GID by clicking the tab and reading `gid=` from the URL.

### 3. Environment

```bash
cp .env.example .env
```

Fill in:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_SHEET_ID=your-spreadsheet-id
VITE_GID_KINGDOMS=0
VITE_GID_DECKS=...
VITE_GID_PLAYERS=...
VITE_GID_ROLES=...
```

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a Google account that has access to the spreadsheet.

## Kingdoms Rules

| Role | Count | Win Condition |
|------|-------|---------------|
| **King** | 1 | Survive — last team standing |
| **Knight** | 1 | Secret ally of the King — wins with the King |
| **Goblin** | 2 | Team — both win if they kill the King |
| **Lord** | 1 | Plays alone — wins by killing the King last (or everyone at once) |
| **Clone Lord** | 1 (6p only) | Same as Lord, but creates Clones instead of Zombies |

When a Lord kills a player, that player returns as a **Zombie** (or **Clone**) with 20 life, fighting for the Lord. If the Lord dies, all their minions die too.
