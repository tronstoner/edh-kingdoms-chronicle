<script setup>
import { computed } from 'vue'
import { useManaGradient, manaGradient } from '../../composables/useManaGradient.js'
import { colorIcons, factionIcon } from '../../mana.js'
import LifeCounter from './LifeCounter.vue'
import DeathBanner from './DeathBanner.vue'

const props = defineProps({
  seat: Object,
  rotated: Boolean,
  allSeats: Array,
  layoutRows: Array,
})

const emit = defineEmits(['changeLife', 'override', 'openSeat', 'openCmdDamage', 'revealRole', 'zombify', 'clone', 'clearUndead'])

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

const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
  'Clone Lord': '#5ba3d9',
}

const roleColor = computed(() => {
  if (!props.seat.role || !props.seat.roleRevealed) return null
  return ROLE_COLORS[props.seat.role]
})

function cmdDmgFrom(fromIndex) {
  const d = props.seat.commanderDamage[fromIndex]
  if (!d) return 0
  return d.cmd1 + d.cmd2
}

function isOtherSide(seatIndex) {
  const myRow = props.layoutRows.find(r => r.seats.includes(props.seat.index))
  const theirRow = props.layoutRows.find(r => r.seats.includes(seatIndex))
  return myRow !== theirRow
}

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
    :style="roleColor ? { borderTopColor: roleColor, borderTopWidth: '3px' } : undefined"
  >
    <!-- Mana color gradient background -->
    <div v-if="gradientOverlay" class="gradient-bg" :style="{ background: gradientOverlay }"></div>

    <!-- Faction watermark background -->
    <i v-if="faction" :class="faction" class="faction-bg"></i>

    <!-- Player name & deck (tappable to edit) -->
    <div class="panel-header" @pointerdown.stop>
      <span class="player-name" @click.stop="emit('openSeat')">{{ seat.player || 'Empty Seat' }}<i v-if="faction" :class="faction" class="faction-icon"></i></span>
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

    <!-- Role + status badges (left side) -->
    <div class="left-badges">
      <div
        v-if="seat.role && seat.roleRevealed"
        class="badge"
        :style="{ color: roleColor, borderColor: roleColor + 'aa' }"
        @pointerdown.stop
        @click.stop="emit('revealRole')"
      >
        <span class="badge-icon">{{ { King: '👑', Knight: '🛡️', Goblin: '🔥', Lord: '🧟', 'Clone Lord': '🧬' }[seat.role] }}</span>
        <span class="badge-val">{{ seat.role }}</span>
      </div>
      <div v-if="seat.roleNotes === 'Zombie'" class="badge" style="color: #a47be0; border-color: #a47be0aa" @pointerdown.stop @click.stop="emit('clearUndead')">
        <span class="badge-icon">&#x1F9DF;</span>
        <span class="badge-val">Zombie</span>
      </div>
      <div v-else-if="seat.roleNotes === 'Clone'" class="badge" style="color: #5ba3d9; border-color: #5ba3d9aa" @pointerdown.stop @click.stop="emit('clearUndead')">
        <span class="badge-icon">&#x1F9EC;</span>
        <span class="badge-val">Clone</span>
      </div>
    </div>

    <!-- Non-zero counters (only shown when relevant) -->
    <div class="counter-badges" @pointerdown.stop @click.stop="emit('openCmdDamage')">
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
          v-for="si in (rotated ? [...row.seats].reverse() : row.seats)"
          :key="si"
          class="minimap-cell"
          :class="{ 'minimap-self': si === seat.index }"
        >
          <div class="minimap-grad" :style="seatGradientStyle(si)"></div>
          <span class="minimap-dmg" :class="{ 'has-damage': cmdDmgFrom(si) > 0 }">{{ cmdDmgFrom(si) || '' }}</span>
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
      @override="emit('override')"
      @reveal-role="emit('revealRole')"
      @zombify="emit('zombify')"
      @clone="emit('clone')"
      @clear-undead="emit('clearUndead')"
    />

    <!-- Winner indicator -->
    <div v-if="seat.isWinner" class="winner-glow"></div>
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
  background-color: #1a1612;
}

.gradient-bg {
  position: absolute;
  inset: 0;
  opacity: 0.3;
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
  font-size: clamp(0.75rem, 2.5vw, 1.1rem);
  color: #d4c8a8;
  white-space: nowrap;
  padding: 0 8px;

}

.faction-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20rem;
  color: #000;
  opacity: 0.1;
  z-index: 0;
  pointer-events: none;
  line-height: 1;
}

.faction-icon {
  margin-left: 6px;
  font-size: 0.85em;
  color: #8a7e66;
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
  font-size: clamp(0.6rem, 1.8vw, 0.85rem);
  color: #8a7e66;
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
  font-size: clamp(3rem, 12vw, 6rem);
  font-weight: 700;
  color: #d4c8a8;
  line-height: 1;
  z-index: 1;
  transition: color 0.3s;
}

.life-danger {
  color: #e2b84a;
}

.life-lethal {
  color: #d95555;
}

.life-dead {
  color: #8a7e66;
}

.left-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
  z-index: 8;
  cursor: pointer;
}

.counter-badges {
  position: absolute;
  top: 8px;
  right: 8px;
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
  border: 1px solid #d4c8a8aa;
  border-radius: 3px;
  color: #d4c8a8;
}

.badge-icon {
  font-size: clamp(0.7rem, 2vw, 1rem);
}

.badge-val {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.6rem, 1.5vw, 0.8rem);
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
  border: 1px solid #d4c8a8aa;
  background: #1a1612;
  cursor: pointer;
  z-index: 8;
  width: clamp(120px, 30vw, 180px);
}

.minimap-row {
  display: flex;
  gap: 2px;
}

.minimap-cell {
  position: relative;
  flex: 1;
  height: clamp(28px, 6vw, 40px);
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1612;
}

.minimap-grad {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  border-radius: 3px;
}

.minimap-dmg {
  position: relative;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.65rem, 2vw, 0.9rem);
  color: #d4c8a844;
  z-index: 1;
}

.minimap-dmg.has-damage {
  color: #d4c8a8;
}


.is-winner {
  border-color: #c9a54e !important;
  box-shadow: inset 0 0 30px #c9a54e22;
}

.winner-glow {
  position: absolute;
  inset: 0;
  border: 2px solid #c9a54e44;
  pointer-events: none;
  z-index: 3;
}
</style>
