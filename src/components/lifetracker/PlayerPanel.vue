<script setup>
import { computed } from 'vue'
import { useManaGradient, manaGradient } from '../../composables/useManaGradient.js'
import { colorIcons, factionIcon } from '../../mana.js'
import { roleIconUrl, conversionIconUrl, lifetrackerRoleLabel } from '../../roles.js'
import { HOUSE_COLORS, cycleRelations, turnPositionFor } from '../../lifetracker/cycle.js'
import LifeCounter from './LifeCounter.vue'
import DeathBanner from './DeathBanner.vue'
import CycleHouseBadge from './CycleHouseBadge.vue'

const BASE_URL = import.meta.env.BASE_URL

const props = defineProps({
  seat: Object,
  rotated: Boolean,
  allSeats: Array,
  layoutRows: Array,
  mode: { type: String, default: 'kingdoms' },
  startingSeatIndex: { type: Number, default: null },
})

const isCycle = computed(() => props.mode === 'cycle')

const emit = defineEmits(['changeLife', 'override', 'openSeat', 'openCmdDamage', 'revealRole', 'zombify', 'clone', 'clearUndead', 'openCycleMap'])

const deckColors = computed(() => props.seat.deck?.colors || '')
const gradient = useManaGradient(deckColors)
const manaIcons = computed(() => colorIcons(deckColors.value))
const faction = computed(() => factionIcon(deckColors.value))

const gradientOverlay = computed(() => {
  const grad = gradient.value
  if (grad === 'transparent') return null
  if (grad.startsWith('linear-gradient')) return grad
  return `linear-gradient(135deg, ${grad}, ${grad})`
})

// Role badge colours come from theme CSS vars (see :root in style.css)
// so the bright theme can dial up saturation without forking this file.
// Returns CSS strings, not hexes — consumed only in inline styles, which
// accept var()/color-mix() natively.
const LT_ROLE_VARS = {
  King: '--lt-role-king',
  Knight: '--lt-role-knight',
  Goblin: '--lt-role-goblin',
  Lord: '--lt-role-lord',
  'Zombie Lord': '--lt-role-lord',
  'Clone Lord': '--lt-role-clone-lord',
}

const roleColor = computed(() => {
  if (!props.seat.role || !props.seat.roleRevealed) return null
  const v = LT_ROLE_VARS[props.seat.role]
  return v ? `var(${v})` : null
})

const roleBorderColor = computed(() => roleColor.value)

const ZOMBIE_COLOR = 'var(--lt-role-lord)'
const ZOMBIE_BORDER = ZOMBIE_COLOR
const CLONE_COLOR = 'var(--lt-role-clone-lord)'
const CLONE_BORDER = CLONE_COLOR

const houseColor = computed(() => {
  if (!isCycle.value || !props.seat.house) return null
  return HOUSE_COLORS[props.seat.house]
})

const accentColor = computed(() => houseColor.value || roleColor.value)

// In Cycle mode, the sigil sits on the side of the panel closest to the
// table's centre so all four sigils converge. In content coords this means:
//   row pos 0 (left-of-row, device coords)  → 'left'  if rotated, 'right' otherwise
//   row pos 1 (right-of-row, device coords) → 'right' if rotated, 'left'  otherwise
// Resulting layout for 4-2t2b:
//   seat 0 (TL): 'left'   seat 1 (TR): 'right'
//   seat 2 (BL): 'right'  seat 3 (BR): 'left'
// Counters live on the opposite side so the panel layout stays symmetric.
const sigilSide = computed(() => {
  if (!isCycle.value) return 'left'
  const row = props.layoutRows?.find(r => r.seats.includes(props.seat.index))
  if (!row) return 'left'
  const pos = row.seats.indexOf(props.seat.index)
  const lastPos = row.seats.length - 1
  const deviceInner = pos === 0 ? 'right' : (pos === lastPos ? 'left' : 'left')
  if (row.rotate === 180) return deviceInner === 'right' ? 'left' : 'right'
  return deviceInner
})

const counterSide = computed(() => sigilSide.value === 'left' ? 'right' : 'left')

// In Cycle, classify each opponent relative to the panel's House.
const myRelations = computed(() => {
  if (!isCycle.value || !props.seat.house) return null
  return cycleRelations(props.seat.house)
})

// Houses whose seat is currently eliminated. Drives strike-through on
// nemesis/rival names in every panel's sigil.
const deadHouses = computed(() => {
  if (!isCycle.value) return []
  return props.allSeats
    .filter(s => s.isDead && !s.deathOverridden && s.house)
    .map(s => s.house)
})

function cycleRelationFor(otherSeatIndex) {
  if (!isCycle.value || otherSeatIndex === props.seat.index) return null
  const rel = myRelations.value
  if (!rel) return null
  const otherHouse = props.allSeats?.[otherSeatIndex]?.house
  if (!otherHouse) return null
  if (otherHouse === rel.nemesis) return 'nemesis'
  if (otherHouse === rel.rival) return 'rival'
  if (otherHouse === rel.hunter) return 'hunter'
  return null
}

// House colour of the seat being plotted (unused now that the minimap
// glyphs are neutral cream, but kept for future highlight use).
function targetHouseColor(otherSeatIndex) {
  const h = props.allSeats?.[otherSeatIndex]?.house
  return h ? HOUSE_COLORS[h] : null
}

// Position the relation glyph at the cell corner closest to the middle of
// the minimap (where the four cells meet) so the four glyphs cluster
// inward — mirrors how the sigils cluster toward the table's centre.
function relIconPosition(rowIndex, colIndex) {
  const vert = rowIndex === 0 ? 'bottom' : 'top'
  const horiz = colIndex === 0 ? 'right' : 'left'
  return { [vert]: '2px', [horiz]: '2px' }
}

function dealerHasPartners(fromIndex) {
  return props.allSeats?.[fromIndex]?.hasPartners || false
}

function dmgText(fromIndex) {
  const d = props.seat.commanderDamage[fromIndex]
  if (!d) return ''
  if (dealerHasPartners(fromIndex)) {
    if (!d.cmd1 && !d.cmd2) return ''
    return `${d.cmd1}/${d.cmd2}`
  }
  return d.cmd1 || ''
}

function hasDmg(fromIndex) {
  const d = props.seat.commanderDamage[fromIndex]
  if (!d) return false
  return dealerHasPartners(fromIndex) ? (d.cmd1 + d.cmd2 > 0) : (d.cmd1 > 0)
}

function isOtherSide(seatIndex) {
  const myRow = props.layoutRows.find(r => r.seats.includes(props.seat.index))
  const theirRow = props.layoutRows.find(r => r.seats.includes(seatIndex))
  return myRow !== theirRow
}

// Bearing (degrees, CSS-rotate convention with 0° pointing right and
// growing clockwise) from this seat to another house's seat. Because the
// top-row panels are rotated 180° at the panel level, drawing an arrow
// using the raw screen-space vector "just works" — the parent rotation
// cancels with the rotated player's POV.
const houseTargetArrows = computed(() => {
  if (!isCycle.value || !props.seat.house) return {}
  const rel = cycleRelations(props.seat.house) || {}
  const housePos = new Map()
  props.layoutRows?.forEach((row, rowIdx) => {
    row.seats.forEach((seatIdx, colIdx) => {
      const s = props.allSeats?.[seatIdx]
      if (s?.house) housePos.set(s.house, { col: colIdx, row: rowIdx })
    })
  })
  const my = housePos.get(props.seat.house)
  if (!my) return {}
  function angleTo(targetHouse) {
    const t = housePos.get(targetHouse)
    if (!t) return null
    return Math.atan2(t.row - my.row, t.col - my.col) * 180 / Math.PI
  }
  return {
    nemesis: angleTo(rel.nemesis),
    rival: angleTo(rel.rival),
  }
})

function seatGradientStyle(seatIndex) {
  const s = props.allSeats?.[seatIndex]
  const grad = manaGradient(s?.deck?.colors || '')
  if (grad === 'transparent') return {}
  const style = { background: grad }
  if (isOtherSide(seatIndex)) style.transform = 'rotate(180deg)'
  return style
}

const panelClasses = computed(() => {
  const c = ['player-panel']
  if (props.seat.isDead && !props.seat.deathOverridden) c.push('is-dead')
  if (props.seat.isWinner) c.push('is-winner')
  return c
})
</script>

<template>
  <div
    :class="panelClasses"
    :style="accentColor ? { borderTopColor: accentColor, borderTopWidth: '3px' } : undefined"
  >
    <!-- Mana color gradient background -->
    <div v-if="gradientOverlay" class="gradient-bg" :style="{ background: gradientOverlay }"></div>

    <!-- Faction watermark background -->
    <i v-if="faction" :class="faction" class="faction-bg"></i>

    <!-- Player name & deck (tappable to edit) -->
    <div class="panel-header" @pointerdown.stop>
      <span class="player-name" @click.stop="emit('openSeat')"><i v-if="faction" :class="faction" class="faction-icon"></i>{{ seat.player || 'Empty Seat' }}</span>
      <span v-if="seat.deck" class="deck-info" @click.stop="emit('openSeat')">
        <span class="deck-name">{{ seat.deck.name }}</span>
        <span v-if="manaIcons.length" class="mana-icons">
          <i v-for="c in manaIcons" :key="c.label" :class="[c.icon, 'ms-cost']"></i>
        </span>
      </span>
    </div>

    <!-- Life total -->
    <div class="life-total" :class="{ 'life-dead': seat.isDead && !seat.deathOverridden, 'life-danger': seat.life <= 10 && seat.life > 0, 'life-lethal': seat.life <= 0 }">
      {{ seat.life }}
    </div>

    <!-- Identity badges (stacked vertically; side mirrors toward centre in Cycle) -->
    <!-- In Cycle, nudge tight to the inner panel edge so all four sigils
         cluster near the device's vertical centre line. Kingdoms keeps the
         original 8px inset. -->
    <div class="left-badges" :style="{ [sigilSide]: isCycle ? '-12px' : '8px' }">
      <!-- Kingdoms: role tag (interactive reveal) -->
      <template v-if="!isCycle">
        <div
          v-if="seat.role && seat.roleRevealed"
          class="role-tag"
          :style="{ color: roleColor, borderColor: roleBorderColor }"
          @pointerdown.stop
          @click.stop="emit('revealRole')"
        >
          <img class="role-tag-img" :src="roleIconUrl(seat.role)" alt="" />
          <span class="role-tag-label">
            <span v-for="word in lifetrackerRoleLabel(seat.role).split(' ')" :key="word">{{ word }}</span>
          </span>
        </div>
        <div
          v-else
          class="role-tag role-tag-pick"
          @pointerdown.stop
          @click.stop="emit('revealRole')"
        >
          <i class="ms ms-ability-cloak role-tag-pick-icon"></i>
          <span class="role-tag-label"><span>Role</span></span>
        </div>
        <div v-if="seat.roleNotes === 'Zombie'" class="role-tag role-tag-conversion" :style="{ color: ZOMBIE_COLOR, borderColor: ZOMBIE_BORDER }" @pointerdown.stop @click.stop="emit('clearUndead')">
          <img class="role-tag-img" :src="conversionIconUrl('Zombie')" alt="" />
          <span class="role-tag-label"><span>Zombie</span></span>
        </div>
        <div v-else-if="seat.roleNotes === 'Clone'" class="role-tag role-tag-conversion" :style="{ color: CLONE_COLOR, borderColor: CLONE_BORDER }" @pointerdown.stop @click.stop="emit('clearUndead')">
          <img class="role-tag-img" :src="conversionIconUrl('Clone')" alt="" />
          <span class="role-tag-label"><span>Clone</span></span>
        </div>
      </template>
      <!-- Cycle: open House badge -->
      <template v-else>
        <CycleHouseBadge
          :house="seat.house"
          :dead-houses="deadHouses"
          :target-arrows="houseTargetArrows"
          @open-map="(h) => emit('openCycleMap', h)"
        />
      </template>
    </div>

    <!-- Cycle: only the starting player gets a turn-order pip. The
         remaining 2nd/3rd/4th positions are implied by clockwise order
         and don't need an explicit indicator on each seat. -->
    <div
      v-if="isCycle && startingSeatIndex !== null && seat.index === startingSeatIndex"
      class="turn-pip turn-pip-first"
    >
      <span>1st</span>
    </div>

    <!-- Non-zero counters (only shown when relevant; side mirrors sigil) -->
    <div class="counter-badges" :style="{ [counterSide]: '8px' }" @pointerdown.stop @click.stop="emit('openCmdDamage')">
      <div v-if="seat.poison > 0" class="badge badge-poison">
        <i class="ms ms-ability-phyrexian badge-icon"></i>
        <span class="badge-val">{{ seat.poison }}</span>
      </div>
      <div v-if="seat.commanderTax > 0" class="badge badge-tax">
        <i class="ms ms-commander badge-icon"></i>
        <span class="badge-val">{{ seat.commanderTax }}</span>
      </div>
    </div>

    <!-- Commander damage mini-map (whole box tappable, hidden when dead) -->
    <div v-if="!seat.isDead || seat.deathOverridden" class="cmd-minimap" @pointerdown.stop @click.stop="emit('openCmdDamage')">
      <div v-for="(row, ri) in (rotated ? [...layoutRows].reverse() : layoutRows)" :key="ri" class="minimap-row">
        <div
          v-for="(si, ci) in (rotated ? [...row.seats].reverse() : row.seats)"
          :key="si"
          class="minimap-cell"
          :class="{ 'minimap-self': si === seat.index, 'minimap-eliminated': allSeats[si] && allSeats[si].isDead && !allSeats[si].deathOverridden }"
        >
          <div class="minimap-grad" :style="seatGradientStyle(si)"></div>
          <span class="minimap-dmg" :class="{ 'has-damage': hasDmg(si) }">{{ dmgText(si) }}</span>
          <span
            v-if="isCycle && si !== seat.index && cycleRelationFor(si)"
            class="minimap-rel"
            :style="relIconPosition(ri, ci)"
            :title="cycleRelationFor(si)"
          >
            <!-- Nemesis: two crossed swords. Same path reused but rotated
                 around a point UP in the blade (y=9) rather than viewBox
                 centre — that pushes the crossguards out into the lower
                 corners of the icon so they don't smear together. -->
            <svg
              v-if="cycleRelationFor(si) === 'nemesis'"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <g fill="currentColor">
                <path transform="rotate(45 12 9)" d="M12 1 L13.75 2.75 L13.75 15 L17 15 L17 17 L13.5 17 L13.5 21 L14.25 21.5 L14.25 23 L9.75 23 L9.75 21.5 L10.5 21 L10.5 17 L7 17 L7 15 L10.25 15 L10.25 2.75 Z"/>
                <path transform="rotate(-45 12 9)" d="M12 1 L13.75 2.75 L13.75 15 L17 15 L17 17 L13.5 17 L13.5 21 L14.25 21.5 L14.25 23 L9.75 23 L9.75 21.5 L10.5 21 L10.5 17 L7 17 L7 15 L10.25 15 L10.25 2.75 Z"/>
              </g>
            </svg>
            <!-- Rival: single sword, filled, tip pointing up-right. -->
            <svg
              v-else-if="cycleRelationFor(si) === 'rival'"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                transform="rotate(45 12 12)"
                d="M12 1 L13.75 2.75 L13.75 15 L17 15 L17 17 L13.5 17 L13.5 21 L14.25 21.5 L14.25 23 L9.75 23 L9.75 21.5 L10.5 21 L10.5 17 L7 17 L7 15 L10.25 15 L10.25 2.75 Z"
              />
            </svg>
            <!-- Hunter / non-target: filled Lucide shield. -->
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          <span
            v-if="allSeats[si] && allSeats[si].isDead && !allSeats[si].deathOverridden && si !== seat.index"
            class="minimap-skull"
            aria-hidden="true"
          >☠</span>
        </div>
      </div>
    </div>

    <!-- Life counter tap zones -->
    <LifeCounter :rotated="rotated" :disabled="seat.isDead && !seat.deathOverridden" @change-life="(delta) => emit('changeLife', delta)" />

    <!-- Death banner -->
    <DeathBanner
      v-if="seat.isDead && !seat.deathOverridden"
      :player-count="allSeats.length"
      :role-revealed="seat.roleRevealed"
      :role-notes="seat.roleNotes"
      :mode="mode"
      @override="emit('override')"
      @reveal-role="emit('revealRole')"
      @zombify="emit('zombify')"
      @clone="emit('clone')"
      @clear-undead="emit('clearUndead')"
    />

    <!-- Winner indicator -->
    <div v-if="seat.isWinner" class="winner-glow"></div>
    <img
      v-if="seat.isWinner"
      class="winner-crown"
      :src="`${BASE_URL}crown-128.png`"
      alt=""
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.player-panel {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid transparent;
  touch-action: none;
  user-select: none;
  -webkit-touch-callout: none;
  transition: border-color 0.3s;
  background-color: var(--lt-bg);
  /* Container query context — interior elements size to the panel, not
     the viewport. Tuned so iPad-landscape (~391×408 panel) matches the
     previous vw-based values; phones get the same proportions scaled. */
  container-type: size;
}

.gradient-bg {
  position: absolute;
  inset: 0;
  opacity: var(--lt-gradient-opacity);
  filter: saturate(var(--lt-gradient-saturate)) brightness(var(--lt-gradient-brightness));
  z-index: 0;
  pointer-events: none;
}

.panel-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 8;

}

.player-name {
  display: inline;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.7rem, 4.5cqmin, 1.1rem);
  color: var(--lt-text);
  white-space: nowrap;
  padding: 0 8px;

}

.faction-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-55%, -55%) perspective(400px) rotateX(20deg) rotateY(-20deg) rotateZ(12deg) scale(1.3);
  font-size: 24rem;
  color: #000;
  opacity: 0.1;
  z-index: 0;
  pointer-events: none;
  line-height: 1;
}

.faction-icon {
  margin-right: 6px;
  font-size: 0.85em;
  color: var(--lt-text-dim);
  vertical-align: baseline;
}

.deck-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;

}

.deck-name {
  font-family: 'EB Garamond', serif;
  font-size: clamp(0.55rem, 3.5cqmin, 0.85rem);
  color: var(--lt-text-dim);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mana-icons {
  display: inline-flex;
  gap: 1px;
  font-size: 0.65rem;
}

.life-total {
  font-family: 'Cinzel', serif;
  font-size: clamp(2.25rem, 24cqmin, 6rem);
  font-weight: 700;
  color: var(--lt-text);
  line-height: 1;
  z-index: 1;
  transition: color 0.3s;
}

.life-danger {
  color: var(--lt-gold-light);
}

.life-lethal {
  color: #d95555;
}

.life-dead {
  color: var(--lt-text-dim);
}

.left-badges {
  position: absolute;
  top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 8;
  cursor: pointer;
  align-items: stretch;
}

.role-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 6px 6px;
  border: 1px solid color-mix(in srgb, var(--lt-text) 67%, transparent);
  border-radius: 4px;
  color: var(--lt-text);
  background: rgba(26, 22, 18, 0.85);
}

.role-tag-img {
  width: clamp(26px, 12cqmin, 48px);
  height: clamp(26px, 12cqmin, 48px);
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.role-tag-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.5rem, 3cqmin, 0.75rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-align: center;
}

.role-tag-conversion .role-tag-img {
  width: clamp(18px, 8.7cqmin, 34px);
  height: clamp(18px, 8.7cqmin, 34px);
}

.role-tag-conversion .role-tag-label {
  font-size: clamp(0.45rem, 2.7cqmin, 0.65rem);
}

.role-tag-pick {
  color: var(--lt-text);
  border-color: color-mix(in srgb, var(--lt-text) 20%, transparent);
  background: rgba(26, 22, 18, 0.25);
  opacity: 0.55;
}

.role-tag-pick-icon {
  font-size: clamp(18px, 9.2cqmin, 36px);
  line-height: 1;
  color: var(--lt-text);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.counter-badges {
  position: absolute;
  top: 8px;
  display: flex;
  gap: 4px;
  z-index: 8;
  cursor: pointer;
}

.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3px 6px;
  border: 1px solid color-mix(in srgb, var(--lt-text) 67%, transparent);
  border-radius: 3px;
  color: var(--lt-text);
}

.badge-icon {
  font-size: clamp(0.65rem, 4.1cqmin, 1rem);
}

.badge-val {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.55rem, 3.3cqmin, 0.8rem);
  font-weight: 700;
}

.cmd-minimap {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--lt-text) 67%, transparent);
  background: var(--lt-bg);
  cursor: pointer;
  z-index: 8;
  width: clamp(90px, 46cqmin, 180px);
}

.minimap-row {
  display: flex;
  gap: 2px;
}

.minimap-cell {
  position: relative;
  flex: 1;
  height: clamp(22px, 10.2cqmin, 40px);
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lt-bg);
}

.minimap-grad {
  position: absolute;
  inset: 0;
  opacity: var(--lt-minimap-grad-opacity);
  filter: saturate(var(--lt-gradient-saturate)) brightness(var(--lt-gradient-brightness));
  border-radius: 3px;
}

.minimap-dmg {
  position: relative;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.55rem, 3.7cqmin, 0.9rem);
  color: color-mix(in srgb, var(--lt-text) 27%, transparent);
  z-index: 1;
}

.minimap-dmg.has-damage {
  color: var(--lt-text);
}

.minimap-rel {
  position: absolute;
  /* Side insets set inline so the icon clusters toward the minimap's
     centre (matching the sigil layout). Cream font colour reads against
     any deck-gradient backdrop; a light drop-shadow keeps the outline
     defined without the harsh outline look. */
  width: clamp(12px, 5.6cqmin, 22px);
  height: clamp(12px, 5.6cqmin, 22px);
  z-index: 2;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lt-text);
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.7));
}

.minimap-rel svg {
  width: 100%;
  height: 100%;
}

.minimap-skull {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.75rem, 4.9cqmin, 1.2rem);
  color: var(--lt-text);
  z-index: 3;
  pointer-events: none;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
}

.minimap-eliminated .minimap-grad { opacity: 0.15; }
.minimap-eliminated .minimap-dmg { opacity: 0.3; }

.turn-pip {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 9;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.5rem, 2.9cqmin, 0.7rem);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--lt-text-dim);
  border: 1px solid var(--lt-border);
  border-radius: 3px;
  padding: 2px 6px;
  background: rgba(26, 22, 18, 0.55);
  pointer-events: none;
}

.turn-pip-first {
  color: var(--lt-gold);
  border-color: var(--lt-gold);
  background: color-mix(in srgb, var(--lt-gold) 13%, transparent);
}


/* When the seat is eliminated, drain the colour from its own sigil so it
   matches the death banner's b/w treatment. Targets the child component's
   root via :deep() since house-badge lives in CycleHouseBadge. */
.player-panel.is-dead :deep(.house-badge) {
  filter: grayscale(1);
  opacity: 0.55;
}

.is-winner {
  border-color: var(--lt-gold) !important;
  box-shadow: inset 0 0 30px color-mix(in srgb, var(--lt-gold) 13%, transparent);
}

.winner-glow {
  position: absolute;
  inset: 0;
  border: 2px solid color-mix(in srgb, var(--lt-gold) 27%, transparent);
  pointer-events: none;
  z-index: 3;
}

/* Crown sits just above the centred life total. After the entry pop,
   a slow vertical bounce keeps the win prominent. Position is computed
   from the panel centre so the gap from the life total stays correct
   as the panel scales. Element unmounts when the win is revoked. */
.winner-crown {
  position: absolute;
  left: 50%;
  top: calc(50% - clamp(1.1rem, 12cqmin, 3rem) - clamp(72px, 41cqmin, 160px) + 36px);
  width: clamp(72px, 41cqmin, 160px);
  z-index: 10;
  pointer-events: none;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.8));
  transform-origin: 50% 100%;
  animation:
    crown-pop 0.8s cubic-bezier(0.22, 1.4, 0.36, 1) both,
    crown-bounce 1.6s ease-in-out 0.8s infinite;
}

@keyframes crown-pop {
  0%   { transform: translate(-50%, -28px) scale(0.4) rotate(-12deg); opacity: 0; }
  55%  { transform: translate(-50%, 0)     scale(1.18) rotate(4deg);  opacity: 1; }
  80%  { transform: translate(-50%, 0)     scale(0.95) rotate(-2deg); }
  100% { transform: translate(-50%, 0)     scale(1)    rotate(0deg);  }
}

@keyframes crown-bounce {
  0%,  100% { transform: translate(-50%, 0)     scale(1) rotate(0deg); }
  50%       { transform: translate(-50%, -14px) scale(1) rotate(0deg); }
}
</style>
