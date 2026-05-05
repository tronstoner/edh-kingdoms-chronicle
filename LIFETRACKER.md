# Lifetracker App

A companion app for tracking EDH/Kingdoms games in real time, replacing manual spreadsheet entry.

## Goals

- Track life totals for all players during a game
- Record game events (kills, zombifications, clones, suicides) as they happen
- Export finished games directly into the Google Sheet (or replace it entirely)

## Core Features

### Game Setup
- Select players from the known roster
- Assign roles (King, Knight, Goblin, Lord, Clone Lord) — or randomize
- Each player selects their deck from the deck list
- Support 5- and 6-player Kingdoms

### Life Tracking
- Starting life: 40 (standard EDH), 20 for Zombies/Clones when recruited
- Increment/decrement buttons per player
- Commander damage tracking (optional)

### Game Events
- Mark player eliminations with cause (combat, combo, Suicide, etc.)
- Lord recruit: mark a killed player as Zombie or Clone (resets life to 20)
- Track turn order / turn count (optional)

### Game End
- Declare winner(s) — auto-determine win/loss based on role alliances
- Save game result to the data source

## Tech Considerations

- Could be a separate route in this Vite/Vue app or a standalone PWA
- Mobile-first — this will be used at the table on phones
- Offline support would be ideal (save locally, sync later)
- Reuse existing player/deck data from the spreadsheet

## Future Ideas

- Timer per turn
- Game history replay
- Stats integration — show relevant stats during deck/role selection
- Push to the existing dashboard without manual sheet editing
