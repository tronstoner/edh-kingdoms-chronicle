# Lifetracker Design Principles

Design rules for the table-based lifetracker UI. These ensure consistency when building or modifying components that render across a physical table where players sit on opposite sides.

## Table Orientation Model

The lifetracker simulates a physical table with two rows of players facing each other:

- **Top row** (row index 0): rotated 180° so that content faces the players sitting across from the device.
- **Bottom row** (row index 1): rendered normally, facing the player holding the device.

Rotation is applied at the row level via `transform: rotate(180deg)` in `TableLayout.vue`. Individual components receive a `rotated: Boolean` prop to know which side of the table they belong to.

## Modals and Overlays

Any modal or overlay opened on behalf of a player must be readable from that player's side of the table:

- If a modal uses `position: fixed` (screen-level), it does **not** inherit the row's CSS rotation.
- Therefore, modals must accept a `rotated` prop and apply `transform: rotate(180deg)` to their panel element when `rotated` is true.
- Determining rotation: check whether the triggering seat index is in `LAYOUTS[layoutId].rows[0].seats` (top row = rotated).

Examples: `CommanderDamageModal`, `RolePicker`.

## Minimap and Cross-Row References

When one player's panel displays visual references to players on the opposite side (e.g. the commander damage minimap):

- The minimap **reverses row and seat order** for rotated panels so the spatial layout matches the physical table from the viewer's perspective.
- **Gradients and directional visuals for opposite-side seats must be rotated 180°.** A gradient rendered on a bottom-row panel normally goes top-left to bottom-right (135deg). When that same gradient is shown in a top-row player's minimap, it must be flipped so it looks correct from their viewing angle.
- Implementation: apply `transform: rotate(180deg)` to gradient elements for seats that belong to a different row than the current panel.

## Device Orientation

The device is laid flat on a table. The table layout must remain stable regardless of how the OS reports portrait/landscape:

- **The table layout always orients to the physical device dimensions.** The longer edge is the table's "width" (rows side by side), the shorter edge is the table's "depth" (top row vs bottom row). This means the seat grid is effectively locked to landscape-style rendering even if the device is in portrait mode.
- **Never stretch or reflow seats based on device rotation.** The physical table doesn't rotate — neither should the seat layout. Track the actual longer/shorter sides and use those as the layout axes.
- **Non-POV UI follows device rotation.** Menus, settings, dialogs, and any interaction that is *not* bound to a specific player's point-of-view should respect normal device orientation. These are read by whoever is holding the device, not by players seated around it.

In practice this means two coordinate systems coexist:
1. **Table space** — fixed to physical device dimensions, used for seat panels and player-POV elements.
2. **Device space** — follows OS orientation, used for app chrome, menus, and general UI.

## Game Menu Placement

The game menu is not a floating overlay — it lives *inside* the table grid, occupying the natural gap between seats:

- **5 players (3+2):** The 2-seat row has a gap between its two seats. The menu icons fit in this gap.
- **6 players (3+3):** A vertical gap runs between columns 2 and 3, spanning both rows. All columns remain equal width.
- The menu gap is sized for comfortable iPad tap targets — non-turn buttons render as squares matching the gap width; the turn-cycle indicator is double-height so it stands out and is easy to hit.
- The menu rotates with its row — if it's in the top row (rotated 180°), the icons flip with it. The player just flips the device to use their preferred orientation.
- The turn-cycle indicator doubles as an increment button (tap to advance). Hold to decrement for corrections.
- Buttons with sub-menus (e.g. "...") open their options as a dropdown/popover from that button.
- Other layouts (future) may require different gap strategies — those will be addressed in the layout refactoring phase.

## Desktop Mode (Future)

A planned "desktop mode" disables all seat rotation — every panel renders right-side-up. This is for scenarios where everyone views the same screen (computer monitor, projector, TV). In desktop mode:

- No row gets `rotate(180deg)`
- The menu gap still applies but is not rotated
- Minimap gradients do not need cross-row flipping
- Modals do not need the `rotated` prop

This mode does not exist yet but the rotation system should remain easy to disable at the layout level (e.g. a `rotate: 0` override on all rows).

## Responsive Sizing — Container Queries

The lifetracker is tuned for an iPad-landscape table (~1180×820). To keep that look intact while scaling gracefully down to phone-sized viewports, interior elements size themselves against **their own container**, not the viewport.

- **`PlayerPanel.vue`** is a `container-type: size` context. Life total, minimap, role tag, badges, death banner, and the Cycle house badge use `cqmin` percentages tuned so iPad-panel dimensions hit the previous `vw`-clamp ceilings exactly.
- **`CommanderDamageModal.vue`** is a `container-type: inline-size` context on `.cmd-panel`. Counter row uses `cqi` plus a `vh` term (`min(20cqi, 22vh)` etc.) so the modal also shrinks vertically on short viewports.
- **Nested containers**: `.counter-box` and `.cmd-seat` are themselves `container-type: size` contexts. Their interior (`.role-box-img`, `.cmd-seat-icons`, `.cmd-split-half` etc.) sizes against the box/seat dimensions via `cqh`. This is what lets a multi-line role label like "Clone Lord" fit a short counter box and the dual-commander split keep its halves balanced even when the seat is 105px tall.
- **Game menu (`GameMenuInline.vue`)**: the menu gap / column shrinks from 64px on iPad to a 40px floor on phones (`clamp(40px, 8vmin, 64px)` in `useTableLayouts.js`). The menu is a `container-type: size` context so the inline icons (turn button, battle menu, fullscreen) scale with the gap width.
- **House badge (`CycleHouseBadge.vue`)** is its own container. `@container (min-width: 115px)` reveals the "Feud" / "Rival" word labels on iPad-sized badges and hides them on phones, where icons + opposing house names alone fit the plate.

Tuning rule: pick the iPad reference pixel target, compute it as a percentage of the iPad container size, write that as the `clamp(min, Xcq*, ceiling)` middle term. iPad lands at the ceiling, smaller viewports interpolate, the floor catches phone extremes.

## Turn Nudge — Fuse + Radial + Pulse

The turn-cycle button has three layered indicators driven by the per-round timer:

1. **Radial pie-fill backdrop** — a subtle gold wedge (`rgba(201, 165, 78, 0.22)`) behind the icon/counter that sweeps clockwise from noon as the round burns down.
2. **Fuse ring** — a thin gold line (`#c9a54e`) tracing the button's 2px border outline at the same progress. Implemented with the same `conic-gradient` masked to the ring via `mask-composite: exclude`. Both the radial and the fuse read the same `--fuse-progress` CSS variable so they stay perfectly in sync.
3. **Gold pulse** — when the timer fully elapses (`turnNudgeActive`), the whole button breathes between its dark base and a warm gold wash on a 1.8s `ease-in-out` cycle. Also fires immediately at `turnCount === 0` as a "start the round" reminder.

### Timer mechanics

- `--fuse-progress` is a registered `@property <percentage>` so CSS transitions can interpolate it between discrete values.
- The parent (`Lifetracker.vue`) ticks a `now` ref once per second via `useNowTick(1000)` and computes `fuseProgress = elapsed / threshold` as a 0..1 value passed down through `TableLayout → GameMenuInline`.
- The button receives the value as an inline `--fuse-progress: X%` style. A short `transition: --fuse-progress 280ms cubic-bezier(...)` glides each per-second jump so it reads as a clock hand easing rather than popping.
- A `:key` derived from `lastTurnAdvanceAt` remounts the fuse/radial spans on round advance so the transition doesn't animate progress backward to 0 — the new spans mount fresh at the current progress.
- `prefers-reduced-motion` disables both visuals and the pulse.

### Threshold curve

The per-round threshold lives in `turnNudgeThresholdMs(turnCount, playerCount, settings)`:

| Round | Factor (% of cap) | At default cap = 5 min/player |
|-------|-------------------|------------------------------|
| 1     | 10%               | 0.5 min/player                |
| 2     | 20%               | 1.0                           |
| 3     | 40%               | 2.0                           |
| 4     | 60%               | 3.0                           |
| 5     | 80%               | 4.0                           |
| 6+    | 100%              | 5.0                           |

The cap is user-settable in the `SettingsModal` (opened from the battle menu) and **scales the whole curve** — at cap = 2, round 1 is 0.2 min/player and round 6 is 2; at cap = 10, round 1 is 1 min/player and round 6 is 10. Round duration also scales with the table (`minutes_per_player × playerCount`).

### Conic-gradient caveat

Both visuals use `conic-gradient`, which sweeps **angularly**. On a non-square rectangle (the turn button is ~2:1) the leading edge of the gradient appears to move faster around the corners and slower in the middle of the long edges, because equal angles cover different perimeter lengths. The radial and fuse stay perfectly synced (they share the same gradient), and at the default 5-min cap the speed variation is barely perceptible — kept as-is in preference to splitting into a perimetric SVG fuse + angular radial that would visibly desync.

## Session Settings

Settings persist across games in `localStorage` under `edhlog-lt-settings`, separate from the game state. Currently:

- `turnNudgeEnabled` (boolean)
- `turnNudgeMaxMinutesPerPlayer` (number, clamped 1–15)

The modal is opened from the "Settings" entry in the battle menu (ms-battle `⋯` button). Designed sectioned so future groups (e.g. life-counter speed, sound, theme) drop in cleanly.

## Commander Damage Data Model

Each seat tracks `commanderDamage[fromSeat] = { cmd1, cmd2 }` for damage received from every other seat. The `hasPartners` flag — whether a player runs partner commanders — lives on the **dealer's seat** (`seat.hasPartners`), not on each opponent's damage entry. This is the single source of truth: if player A toggles partner mode for player B in their own damage modal, every other player's damage map sees B as dual-commander too.

Toggling between dual and single mode never zeros `cmd2` — the value is preserved so the player can flip back without losing tracked damage.

Lethality is per-commander (each `cmd1` or `cmd2 >= 21` is lethal alone), not summed. The minimap on `PlayerPanel` shows `cmd1/cmd2` when the dealer has partners and a single value otherwise.

## Button Design System (TODO)

There is currently no unified button design system for the lifetracker. Primary button styles (dark solid gold background, muted gold text/border) are duplicated across at least four components — `DeathBanner.vue`, `ConfirmDialog.vue`, `Lifetracker.vue`, and `CycleSetupPreview.vue` — each defining their own class (`.death-btn-primary`, `.confirm-btn-primary`, `.lt-btn-primary`, `.btn-primary`). Many other action buttons that should visually read as primary are unstyled or use ad-hoc gold tints.

**Needs:** extract a shared button token/class (e.g. a `lifetracker-buttons.css` or a `LtButton.vue` wrapper) so that primary, secondary, danger, and ghost variants are defined once and used consistently everywhere.

## General Rules

1. **Every visual element has a viewer.** Always ask: who is looking at this element, and from which side of the table?
2. **Rotation is the player's concern, not the data's.** Data flows normally (seat indices, damage values). Only the *presentation* rotates.
3. **Use flex/grid for layout, not absolute percentage positioning.** Related elements should use flex or grid so they reflow naturally across screen sizes.
4. **Test both sides.** When modifying any component that appears on both rows, verify it looks correct from both orientations.
5. **Avoid expensive CSS operations.** The lifetracker runs on low-end tablets with weak GPUs. Three operations have proven to cause real lag:
   - **`transition: all`** — forces the browser to snapshot every CSS property on every matched element during any state change. Always use explicit properties: `transition: background-color 0.2s, border-color 0.2s, color 0.2s`.
   - **`backdrop-filter`** — each instance creates a separate GPU compositing layer and runs a pixel shader over the area behind it. With 4–6 player panels on screen simultaneously, even a small `blur(2px)` on each causes continuous compositing cost. Use a solid or semi-opaque background instead.
   - **Infinite CSS animations on multiple elements** — `animation: foo infinite` running on several panels at once keeps the GPU busy every frame. Use sparingly and only on single elements.
