<script setup>
import { computed } from 'vue'
import { colorIcons } from '../../mana.js'

const props = defineProps({
  seat: Object,
  allSeats: Array,
})

const emit = defineEmits(['change', 'togglePartners', 'close'])

const opponents = computed(() =>
  props.allSeats.filter((_, i) => i !== props.seat.index)
)

function getDmg(fromIndex) {
  return props.seat.commanderDamage[fromIndex] || { cmd1: 0, cmd2: 0, hasPartners: false }
}

function totalFrom(fromIndex) {
  const d = getDmg(fromIndex)
  return d.cmd1 + d.cmd2
}
</script>

<template>
  <div class="cmd-modal" @click.self="emit('close')">
    <div class="cmd-content">
      <h3 class="font-beleren text-mtg-gold mb-2">Commander Damage</h3>
      <div class="cmd-player font-beleren text-mtg-text mb-4">{{ seat.player }}</div>

      <div class="opp-list">
        <div
          v-for="opp in opponents"
          :key="opp.index"
          class="opp-row"
        >
          <div class="opp-info">
            <span class="opp-name font-beleren">{{ opp.player }}</span>
            <span v-if="opp.deck" class="opp-deck">
              {{ opp.deck.name }}
              <span v-if="opp.deck.colors" class="opp-mana">
                <i v-for="c in colorIcons(opp.deck.colors)" :key="c.label" :class="[c.icon, 'ms-cost']"></i>
              </span>
            </span>
          </div>

          <!-- Commander 1 -->
          <div class="cmd-counter">
            <button class="cmd-btn" @click="emit('change', seat.index, opp.index, 1, -1)">&minus;</button>
            <span class="cmd-total" :class="{ lethal: getDmg(opp.index).cmd1 >= 21 }">
              {{ getDmg(opp.index).cmd1 }}
            </span>
            <button class="cmd-btn" @click="emit('change', seat.index, opp.index, 1, 1)">+</button>
          </div>

          <!-- Commander 2 (partners) -->
          <div v-if="getDmg(opp.index).hasPartners" class="cmd-counter">
            <button class="cmd-btn" @click="emit('change', seat.index, opp.index, 2, -1)">&minus;</button>
            <span class="cmd-total" :class="{ lethal: getDmg(opp.index).cmd2 >= 21 }">
              {{ getDmg(opp.index).cmd2 }}
            </span>
            <button class="cmd-btn" @click="emit('change', seat.index, opp.index, 2, 1)">+</button>
          </div>

          <div class="cmd-row-footer">
            <button class="partner-toggle" @click="emit('togglePartners', seat.index, opp.index)">
              {{ getDmg(opp.index).hasPartners ? 'Single cmdr' : 'Partners' }}
            </button>
            <div class="cmd-bar-wrap">
              <div
                class="cmd-bar"
                :class="{ danger: totalFrom(opp.index) >= 16 }"
                :style="{ width: Math.min(totalFrom(opp.index) / 21 * 100, 100) + '%' }"
              ></div>
            </div>
            <span class="cmd-sum">{{ totalFrom(opp.index) }}/21</span>
          </div>
        </div>
      </div>

      <button class="close-btn" @click="emit('close')">Done</button>
    </div>
  </div>
</template>

<style scoped>
.cmd-modal {
  position: fixed;
  inset: 0;
  background: #1a1612ee;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.cmd-content {
  background: #231f1a;
  border: 2px solid #3d3529;
  border-radius: 12px;
  padding: 24px;
  max-width: 420px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
}

.cmd-player {
  font-size: 1rem;
  color: #d4c8a8;
}

.opp-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.opp-row {
  border: 1px solid #3d352944;
  border-radius: 8px;
  padding: 12px;
  background: #1a161266;
}

.opp-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.opp-name {
  font-size: 1rem;
  color: #d4c8a8;
}

.opp-deck {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  color: #8a7e66;
  font-style: italic;
}

.opp-mana {
  display: inline-flex;
  gap: 1px;
  margin-left: 4px;
  font-size: 0.7rem;
}

.cmd-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.cmd-btn {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid #3d3529;
  background: #231f1a;
  color: #d4c8a8;
  font-family: 'Cinzel', serif;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.cmd-btn:hover {
  border-color: #c9a54e66;
  background: #c9a54e11;
}

.cmd-total {
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  color: #d4c8a8;
  min-width: 40px;
  text-align: center;
}

.cmd-total.lethal {
  color: #d95555;
}

.cmd-row-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.partner-toggle {
  font-family: 'EB Garamond', serif;
  font-size: 0.85rem;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #3d352966;
  background: none;
  color: #8a7e66;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.partner-toggle:hover {
  border-color: #8a7e66;
  color: #d4c8a8;
}

.cmd-bar-wrap {
  flex: 1;
  height: 6px;
  background: #3d352944;
  border-radius: 3px;
  overflow: hidden;
}

.cmd-bar {
  height: 100%;
  background: #c9a54e;
  border-radius: 3px;
  transition: width 0.3s;
}

.cmd-bar.danger {
  background: #d95555;
}

.cmd-sum {
  font-family: 'EB Garamond', serif;
  font-size: 0.8rem;
  color: #8a7e66;
  min-width: 36px;
  text-align: right;
}

.close-btn {
  display: block;
  margin: 20px auto 0;
  font-family: 'Cinzel', serif;
  font-size: 1.1rem;
  padding: 14px 32px;
  border-radius: 8px;
  border: 1px solid #c9a54e66;
  background: #c9a54e22;
  color: #c9a54e;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #c9a54e33;
  border-color: #c9a54e;
}
</style>
