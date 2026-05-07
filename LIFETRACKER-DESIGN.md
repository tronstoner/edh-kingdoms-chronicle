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

## Commander Damage Data Model

Each seat tracks `commanderDamage[fromSeat] = { cmd1, cmd2 }` for damage received from every other seat. The `hasPartners` flag — whether a player runs partner commanders — lives on the **dealer's seat** (`seat.hasPartners`), not on each opponent's damage entry. This is the single source of truth: if player A toggles partner mode for player B in their own damage modal, every other player's damage map sees B as dual-commander too.

Toggling between dual and single mode never zeros `cmd2` — the value is preserved so the player can flip back without losing tracked damage.

Lethality is per-commander (each `cmd1` or `cmd2 >= 21` is lethal alone), not summed. The minimap on `PlayerPanel` shows `cmd1/cmd2` when the dealer has partners and a single value otherwise.

## General Rules

1. **Every visual element has a viewer.** Always ask: who is looking at this element, and from which side of the table?
2. **Rotation is the player's concern, not the data's.** Data flows normally (seat indices, damage values). Only the *presentation* rotates.
3. **Use flex/grid for layout, not absolute percentage positioning.** Related elements should use flex or grid so they reflow naturally across screen sizes.
4. **Test both sides.** When modifying any component that appears on both rows, verify it looks correct from both orientations.
