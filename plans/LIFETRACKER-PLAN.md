# Lifetracker Implementation Plan

## Context

The group tracks EDH Kingdoms games in a Google Sheet. Currently game data is entered manually after each session. The lifetracker will be a mobile-first in-game companion that tracks life, commander damage, poison, and game events in real time, then exports a formatted entry to copy-paste into the spreadsheet. Data lives in localStorage only — no server sync.

Reference apps: **Lifetrinket** (table layouts, rotated panels, clean mobile UX) and **Lifetap** (deck color gradients for seat backgrounds).

---

## File Structure

```
src/
  router.js                              # Add /lifetracker route
  pages/
    Lifetracker.vue                      # Full-screen page, owns game state
  components/lifetracker/
    SetupScreen.vue                      # Player count, layout, seat config
    LayoutPicker.vue                     # Visual layout chooser
    DeckPicker.vue                       # Player + deck selection, temp deck
    TableLayout.vue                      # CSS grid positioning of panels
    PlayerPanel.vue                      # Single seat: life, name, deck, status
    LifeCounter.vue                      # Tap zones for +/- 1/10, hold logic
    CommanderDamageModal.vue             # Per-opponent commander damage grid
    PoisonCounter.vue                    # Toggle + counter
    RoleOverlay.vue                      # Role reveal mechanic
    HistoryDrawer.vue                    # Life change log viewer
    ExportModal.vue                      # Format + copy game log
    DeathBanner.vue                      # Death overlay with override
    GameMenu.vue                         # Floating menu (turn counter, history, export, etc.)
  composables/
    useLifetrackerState.js               # Reactive state + localStorage sync
    useLifeCounter.js                    # Tap/hold interaction + history batching
    useManaGradient.js                   # Deck WUBRG colors → CSS gradient
    useTableLayouts.js                   # Layout definitions for 5-6 players
    useWakeLock.js                       # Screen wake lock API
```

## Key Existing Files to Reuse

- `src/mana.js` — `MANA_MAP`, `colorIcons()` for mana icons
- `src/data.js` — deck/player data structure (inject via `provide('data')`)
- `src/style.css` — theme colors (`mtg-*`, `mana-*`, `role-*`), fonts

---

## State Design

Single reactive object in `useLifetrackerState.js`, synced to localStorage with debounced `watchEffect` (500ms).

```
gameState = {
  id: string,
  phase: 'setup' | 'playing' | 'finished',
  playerCount: 5 | 6,
  layoutId: string,
  turnCount: number,
  startTime: string,
  seats: [{
    index: number,
    player: string | null,
    deck: { name, colors, isTemp } | null,
    role: string | null,           // King/Knight/Goblin/Lord/Clone Lord
    roleRevealed: boolean,
    life: number,                  // starts at 40
    poison: number,
    poisonEnabled: boolean,
    commanderTax: number,          // recast counter (0, 1, 2...)
    commanderDamage: {             // damage received FROM each opponent
      [seatIndex]: { cmd1: number, cmd2: number, hasPartners: boolean }
    },
    isDead: boolean,
    deathOverridden: boolean,      // Platinum Angel etc.
    deathTurn: number | null,
    isWinner: boolean,
    history: [{ timestamp, delta, newTotal, source }]
  }]
}
```

**localStorage keys:**
- `edhlog-lt-current` — active game (survives refresh)
- `edhlog-lt-completed` — array of finished game summaries

---

## Table Layouts

5 and 6 players only. CSS grid with `100dvh × 100dvw`. Top-row panels get `transform: rotate(180deg)` so players across the table can read their own panel.

| Players | Layouts |
|---------|---------|
| 5 | 3 top + 2 bottom (default), 2 top + 3 bottom |
| 6 | 3 top + 3 bottom |

`LayoutPicker` shows small visual diagrams with colored dots for each option.

---

## Life Counter Interaction

The `PlayerPanel` area is split into two tap zones (left = minus, right = plus):
- **Single tap**: ±1
- **Tap near top/bottom edges** (25% zone): ±10
- **Touch-and-hold** (500ms threshold): continuous increment, ±1 every 150ms, accelerating to ±5 after 2s
- Visual feedback: brief flash on tapped zone, number animation
- Haptic via `navigator.vibrate(10)` if available
- Use `@pointerdown/@pointerup` (not `@click`) for responsiveness
- `touch-action: none` on panels to prevent scroll/zoom

**History batching**: Changes within a 2-second window are grouped into one log entry (e.g., three quick +1 taps → single `{ delta: +3 }` entry). Prevents misclick noise.

---

## Commander Damage

- Tap player name/deck area → opens `CommanderDamageModal` for that seat
- Shows one row per opponent: name, deck, mana icons, counter with ±buttons
- Toggle per opponent to split into two commander tracks (partner commanders)
- Progress bar toward 21, turns red at 16+
- **Adding commander damage also subtracts from life total** automatically
- Reaching 21 from any single commander triggers death auto-detect
- Small summary badges on `PlayerPanel` showing non-zero damage from each opponent

## Commander Tax

- Simple recast counter on each `PlayerPanel` (small, in a corner)
- Increment/decrement, display only (players mentally multiply by 2)
- No interaction with life total

## Poison

- Toggle per player (off by default)
- When enabled, shows counter with ±1 buttons
- Auto-detect death at 10

---

## Deck Color Gradients

`useManaGradient.js` converts WUBRG string to CSS gradient at ~15% opacity over dark base:

| Colors | Gradient |
|--------|----------|
| W | `#f9faf4` |
| U | `#0e68ab` |
| B | `#3d2b4f` (not pure black) |
| R | `#d3202a` |
| G | `#00733e` |

- 1 color → solid at 15% opacity
- 2+ colors → `linear-gradient(135deg, ...)` evenly spaced, 15% opacity
- No colors → neutral `mtg-card` default

---

## Role System

**Setup**: King selected by tapping a seat. Other roles assigned via dropdown per seat.

| Players | Roles |
|---------|-------|
| 5 | King, Knight, 2× Goblin, Lord |
| 6 | King, Knight, 2× Goblin, Lord, Clone Lord |

**In-game**: Each seat has a role badge (face-down card icon). Tap to reveal with flip animation. Revealed badges show role name in role color. Panel gets subtle role-colored border glow when revealed.

---

## Death & Win Mechanics

**Auto-detect death**: life ≤ 0, any single commander damage ≥ 21, poison ≥ 10
- `DeathBanner` overlay with "Override" button (Platinum Angel, etc.)
- Override keeps player active with a special indicator
- If life goes back above threshold, auto-clear death
- First death records `deathTurn` from turn counter

**Manual win/death**: Via `GameMenu` — set any player as dead or winner for alternate win conditions (e.g., Thassa's Oracle) without needing life changes.

---

## Export

Formats game data matching the spreadsheet columns: `Date | Player | Deck | Role | Result | Role Notes | First KO | Game End | Game Notes`

```
5/5/26   Ralf     Atraxa     King      Win
         Markus   Yuriko     Knight    Win
         Hannes   Prossh     Goblin    Loss
         Ivan     Muldrotha  Goblin    Loss    
         David    Meren      Lord      Loss    Zombie
```

- Date only on first row (matches `parseGames` format)
- First KO: player tag derived from `deathTurn`
- Role Notes: editable field in export modal (Zombie, Clone, Suicide)
- Copy-to-clipboard button
- Save to `edhlog-lt-completed` in localStorage

---

## Setup Flow

1. Choose player count (5 or 6) → show `LayoutPicker`
2. Tap each seat → `DeckPicker` opens: select player from roster, then their deck (filtered by owner from spreadsheet data)
   - "Temporary deck" option: enter name + toggle WUBRG color buttons
3. Tap a seat to crown as King, assign remaining roles
4. "Start Game" → transitions to `playing` phase

---

## Full-Screen Approach

`Lifetracker.vue` uses `position: fixed; inset: 0; z-index: 100` to overlay the entire viewport, bypassing App.vue header/footer. No conditional logic needed in App.vue. A back button in `GameMenu` navigates to `/`.

**Browser Fullscreen API**: On game start (or via a `GameMenu` toggle), call `document.documentElement.requestFullscreen()` to hide browser chrome (address bar, tabs). Exit fullscreen when leaving the lifetracker. Maximizes screen real estate on mobile. Fall back gracefully if the API is unavailable or denied.

## Aspect Ratio & Responsive Layout

The lifetracker must work across different screen shapes — portrait phones, landscape phones, tablets.

- Detect orientation/aspect ratio via `matchMedia('(orientation: portrait)')` or by comparing `innerWidth` vs `innerHeight`
- **Portrait**: panels are wider than tall, life total dominates vertically, secondary counters (poison, tax) compact into a row
- **Landscape**: panels are taller than wide, more vertical space for counters and commander damage badges
- `PlayerPanel` content reflows based on panel aspect ratio using container queries (`@container`) or flex-wrap
- `useTableLayouts.js` can offer different default layouts per orientation (e.g. 5-player portrait: 3 top + 2 bottom; landscape: 2 left + 3 right)
- Life total font size scales with panel size via `clamp()` to stay readable at any dimension

---

## Implementation Phases

### Phase 1: Skeleton
1. `useLifetrackerState.js` — state + localStorage
2. `Lifetracker.vue` — page shell + route in `router.js`
3. `useTableLayouts.js` — layout definitions
4. `TableLayout.vue` — CSS grid
5. `PlayerPanel.vue` — basic display (name, life, deck)
6. `useManaGradient.js` — gradient backgrounds

### Phase 2: Life Interaction
7. `LifeCounter.vue` + `useLifeCounter.js` — tap zones, hold, batching
8. Death auto-detection in state composable
9. `DeathBanner.vue`

### Phase 3: Setup
10. `SetupScreen.vue` — player count, layout
11. `LayoutPicker.vue` — visual chooser
12. `DeckPicker.vue` — player/deck selection + temp deck

### Phase 4: Secondary Trackers
13. `PoisonCounter.vue`
14. `CommanderDamageModal.vue` — including auto life-subtract
15. Commander tax counter on `PlayerPanel`
16. Turn counter in `GameMenu`

### Phase 5: Roles
17. `RoleOverlay.vue` — assignment in setup + reveal mechanic
18. Role colors/glow on panels

### Phase 6: History & Export
19. `HistoryDrawer.vue`
20. `ExportModal.vue` + completed game storage
21. Manual win/death controls in `GameMenu`

### Phase 7: Polish & Responsiveness

**Priority 1: Game menu & turn counter rework**
- Current bottom bar is unusable on mobile — too small, hard to reach
- Redesign as a proper floating action menu
- Turn counter needs to be prominent and always accessible
- Consider a circular/radial menu or a slide-up panel

**Priority 2: Responsive layout overhaul**
- Needs a proper concept before implementation, not incremental fixes
- Test all views on small phones, large phones, tablets (portrait + landscape)
- Player panel content: life total, name, deck, minimap, badges must scale and reflow per panel size
- Commander damage modal: counter boxes, layout seats, and progress bars must adapt to viewport
- Setup screen and deck picker must be usable on small screens
- Use container queries or aspect-ratio media queries where clamp() isn't sufficient
- Ensure touch targets are minimum 44px on all screen sizes
- Test minimap readability at all sizes

**Priority 3: Refactoring**
- Layout system needs proper abstraction for column-based layouts (head-of-table seating)
- Single shared layout renderer for main view, minimap, and damage modal
- Rotation handling for 90°/270° side seats (not just 180°)
- Current approach duplicates layout rendering logic in 3 places — fragile and causes regressions
- Plan the abstraction before implementing new layouts

**Priority 4: Additional features**
- `useWakeLock.js` — keep screen on during game
- Fullscreen API integration to hide browser chrome
- Animations (life changes, death, role reveal)
- Haptic feedback
- Resume-game prompt on page load
- History drawer for life change log

---

## Verification

1. Start dev server (`npm run dev`), navigate to `/lifetracker`
2. Set up a 5-player game — verify layout, player/deck selection, deck gradient backgrounds
3. Test life counter: tap ±1, edge taps ±10, hold for continuous increment
4. Test commander damage: add damage, verify life decreases simultaneously, verify 21 triggers death
5. Test poison: enable, increment to 10, verify death trigger
6. Test death override (Platinum Angel) — player stays active
7. Test role reveal animation
8. Test turn counter advancement
9. Test export: verify format matches spreadsheet columns, copy works
10. Test localStorage persistence: refresh mid-game, verify state resumes
11. Test on mobile: rotated panels readable, touch interactions responsive, no accidental zoom/scroll
