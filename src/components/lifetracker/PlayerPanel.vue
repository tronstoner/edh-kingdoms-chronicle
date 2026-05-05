<script setup>
import { computed } from 'vue'
import { useManaGradient, manaGradient } from '../../composables/useManaGradient.js'
import { colorIcons } from '../../mana.js'
import LifeCounter from './LifeCounter.vue'
import DeathBanner from './DeathBanner.vue'

const props = defineProps({
  seat: Object,
  rotated: Boolean,
  allSeats: Array,
  layoutRows: Array,
})

const emit = defineEmits(['changeLife', 'override', 'openSeat', 'openCmdDamage'])


const deckColors = computed(() => props.seat.deck?.colors || '')
const gradient = useManaGradient(deckColors)
const manaIcons = computed(() => colorIcons(deckColors.value))

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

function seatGradientStyle(seatIndex) {
  const s = props.allSeats?.[seatIndex]
  const grad = manaGradient(s?.deck?.colors || '')
  if (grad === 'transparent') return {}
  return { background: grad }
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
    :style="{ borderColor: roleColor || undefined }"
  >
    <!-- Mana color gradient background -->
    <div v-if="gradientOverlay" class="gradient-bg" :style="{ background: gradientOverlay }"></div>

    <!-- Player name & deck (tappable to edit) -->
    <div class="panel-header" @pointerdown.stop @click.stop="emit('openSeat')">
      <div class="player-name">{{ seat.player || 'Empty Seat' }}</div>
      <div v-if="seat.deck" class="deck-info">
        <span class="deck-name">{{ seat.deck.name }}</span>
        <span v-if="manaIcons.length" class="mana-icons">
          <i v-for="c in manaIcons" :key="c.label" :class="[c.icon, 'ms-cost']"></i>
        </span>
      </div>
    </div>

    <!-- Life total -->
    <div class="life-total" :class="{ 'life-danger': seat.life <= 10 && seat.life > 0, 'life-lethal': seat.life <= 0 }">
      {{ seat.life }}
    </div>

    <!-- Role badge -->
    <div
      v-if="seat.role && seat.roleRevealed"
      class="role-badge"
      :style="{ backgroundColor: roleColor + '33', color: roleColor, borderColor: roleColor + '66' }"
    >
      {{ seat.role }}
    </div>
    <div v-else-if="seat.role" class="role-badge role-hidden">
      ?
    </div>

    <!-- Non-zero counters (only shown when relevant) -->
    <div class="counter-badges">
      <span v-if="seat.poison > 0" class="badge badge-poison"><i class="ms ms-ability-phyrexian"></i> {{ seat.poison }}</span>
      <span v-if="seat.commanderTax > 0" class="badge badge-tax"><i class="ms ms-commander"></i> {{ seat.commanderTax }}</span>
    </div>

    <!-- Commander damage mini-map (whole box tappable) -->
    <div class="cmd-minimap" @pointerdown.stop @click.stop="emit('openCmdDamage')">
      <div v-for="(row, ri) in layoutRows" :key="ri" class="minimap-row">
        <div
          v-for="si in row.seats"
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
    <LifeCounter :rotated="rotated" @change-life="(delta) => emit('changeLife', delta)" />

    <!-- Death banner -->
    <DeathBanner v-if="seat.isDead && !seat.deathOverridden" @override="emit('override')" />

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
  top: 8px;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 2;
}

.player-name {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.75rem, 2.5vw, 1.1rem);
  color: #d4c8a8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 8px;
}

.deck-info {
  display: flex;
  align-items: center;
  justify-content: center;
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

.role-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.55rem, 1.5vw, 0.75rem);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
  z-index: 2;
}

.role-hidden {
  background-color: #3d352966;
  color: #8a7e66;
  border-color: #3d3529;
}

.counter-badges {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  z-index: 4;
}

.badge {
  font-family: 'Cinzel', serif;
  font-size: clamp(0.6rem, 1.5vw, 0.75rem);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
}

.badge-poison {
  color: #00733e;
  background: #00733e22;
  border-color: #00733e44;
}

.badge-tax {
  color: #8a7e66;
  background: #3d352944;
  border-color: #3d352966;
}

.cmd-minimap {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px;
  border-radius: 6px;
  border: 1px solid #3d352966;
  background: #1a161288;
  cursor: pointer;
  z-index: 4;
}

.minimap-row {
  display: flex;
  gap: 1px;
}

.minimap-cell {
  position: relative;
  width: clamp(22px, 6vw, 32px);
  height: clamp(16px, 3.5vw, 22px);
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.minimap-grad {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  border-radius: 3px;
}

.minimap-self .minimap-grad {
  opacity: 0.15;
}

.minimap-dmg {
  position: relative;
  font-family: 'Cinzel', serif;
  font-size: clamp(0.5rem, 1.3vw, 0.7rem);
  color: #d4c8a844;
  z-index: 1;
}

.minimap-dmg.has-damage {
  color: #d4c8a8;
}

.is-dead {
  opacity: 0.5;
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
