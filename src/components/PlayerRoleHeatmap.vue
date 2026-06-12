<script setup>
import { ref } from 'vue'
import ChartCard from './ChartCard.vue'
import RoleDetailModal from './RoleDetailModal.vue'
import { ROLE_COLORS, rolePortraitUrl } from '../roles.js'

defineProps({ players: Array })

const roles = ['King', 'Knight', 'Goblin', 'Lord']
const mode = ref('winRate')

const EXPECTED_DRAW = { King: 0.20, Knight: 0.20, Goblin: 0.40, Lord: 0.20 }

function getRoleData(player, role) {
  const key = role.toLowerCase()
  return { games: player[key + 'Games'], winRate: player[key + 'WinRate'] }
}

function getDrawBias(player, role) {
  const key = role.toLowerCase()
  const games = player[key + 'Games'] || 0
  const actual = player.games > 0 ? games / player.games : 0
  const deviation = actual - (EXPECTED_DRAW[role] || 0)
  return { actual, deviation, games }
}

function winRateCellStyle(wr) {
  if (wr == null) return { backgroundColor: '#1a161288', color: '#4a3f2f' }
  const alpha = wr * 0.5 + 0.08
  return { backgroundColor: `rgba(201, 165, 78, ${alpha})`, color: wr >= 0.3 ? '#e2c878' : '#8a7e66' }
}

function biasCellStyle(deviation) {
  const d = deviation * 100
  if (Math.abs(d) < 2) return { backgroundColor: '#1a161288', color: '#8a7e66' }
  if (d > 0) {
    const alpha = Math.min(d / 20, 1) * 0.5 + 0.05
    return { backgroundColor: `rgba(217, 85, 85, ${alpha})`, color: '#fca5a5' }
  }
  const alpha = Math.min(-d / 20, 1) * 0.4 + 0.05
  return { backgroundColor: `rgba(91, 163, 217, ${alpha})`, color: '#93c5fd' }
}

function pct(v) {
  return v != null ? (v * 100).toFixed(0) + '%' : null
}

const detailRole = ref(null)
function openDetail(role) { detailRole.value = role }
function closeDetail() { detailRole.value = null }
</script>

<template>
  <ChartCard>
    <template #title>Allegiance Mastery</template>

    <div class="flex justify-end mb-4">
      <div class="inline-flex rounded-lg border border-mtg-border overflow-hidden text-xs font-beleren">
        <button
          @click="mode = 'winRate'"
          class="px-3 py-1 transition-colors"
          :class="mode === 'winRate' ? 'bg-mtg-gold text-mtg-dark' : 'bg-mtg-dark text-mtg-text-dim hover:text-mtg-text'"
        >Win Rate</button>
        <button
          @click="mode = 'drawBias'"
          class="px-3 py-1 transition-colors border-l border-mtg-border"
          :class="mode === 'drawBias' ? 'bg-mtg-gold text-mtg-dark' : 'bg-mtg-dark text-mtg-text-dim hover:text-mtg-text'"
        >Role Draw Bias</button>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full font-body text-base">
        <thead>
          <tr class="border-b-2 border-mtg-border">
            <th class="text-left py-3 pr-6 font-beleren text-mtg-gold-light text-sm tracking-wider uppercase">Champion</th>
            <th
              v-for="r in roles" :key="r"
              class="text-center py-3 px-2 font-beleren text-sm tracking-wider uppercase"
              :style="{ color: ROLE_COLORS[r] }"
            >
              <button
                type="button"
                class="role-header-btn"
                :style="{ color: ROLE_COLORS[r] }"
                :aria-label="`About ${r}`"
                @click="openDetail(r)"
              >
                <img :src="rolePortraitUrl(r)" :alt="r" class="role-portrait-thumb" />
                <span class="role-header-label">{{ r }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in players" :key="p.name" class="border-b border-mtg-border/40">
            <td class="py-3 pr-6 font-beleren text-lg">
              <router-link :to="'/player/' + p.name" class="text-mtg-text no-underline hover:text-mtg-gold transition-colors">{{ p.name }}</router-link>
            </td>

            <!-- Win Rate mode -->
            <template v-if="mode === 'winRate'">
              <td v-for="r in roles" :key="r" class="text-center py-3 px-2">
                <div
                  v-if="getRoleData(p, r).games"
                  class="rounded-lg px-3 py-2 text-center border border-mtg-border/30 font-beleren"
                  :style="winRateCellStyle(getRoleData(p, r).winRate)"
                >
                  <div class="text-lg">{{ pct(getRoleData(p, r).winRate) }}</div>
                  <div class="text-xs opacity-50 font-body">{{ getRoleData(p, r).games }} games</div>
                </div>
                <div v-else class="text-mtg-text-dim/30 text-lg">&mdash;</div>
              </td>
            </template>

            <!-- Draw Bias mode -->
            <template v-else>
              <td v-for="r in roles" :key="r" class="text-center py-3 px-2">
                <div
                  v-if="getDrawBias(p, r).games"
                  class="rounded-lg px-3 py-2 text-center border border-mtg-border/30 font-beleren"
                  :style="biasCellStyle(getDrawBias(p, r).deviation)"
                >
                  <div class="text-lg">{{ pct(getDrawBias(p, r).actual) }}</div>
                  <div class="text-xs font-body opacity-80">
                    {{ getDrawBias(p, r).deviation >= 0 ? '+' : '' }}{{ (getDrawBias(p, r).deviation * 100).toFixed(0) }}%
                  </div>
                </div>
                <div v-else class="text-mtg-text-dim/30 text-lg">&mdash;</div>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="mt-5 border-t border-mtg-border/50 pt-4">
      <template v-if="mode === 'winRate'">
        <div class="flex flex-wrap items-center gap-4 text-sm font-body text-mtg-text-dim">
          <span class="font-beleren text-mtg-gold-light text-xs tracking-wider uppercase">Win rate scale:</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-8 h-4 rounded" style="background: rgba(201,165,78,0.08)"></span> 0%</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-8 h-4 rounded" style="background: rgba(201,165,78,0.33)"></span> 50%</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-8 h-4 rounded" style="background: rgba(201,165,78,0.58)"></span> 100%</span>
          <span class="ml-auto italic">Allied wins count for both members</span>
        </div>
      </template>
      <template v-else>
        <div class="flex flex-wrap items-center gap-4 text-sm font-body text-mtg-text-dim">
          <span class="font-beleren text-mtg-gold-light text-xs tracking-wider uppercase">Draw bias vs expected:</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-8 h-4 rounded" style="background: rgba(91,163,217,0.35)"></span> Under-drawn</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-8 h-4 rounded" style="background: #1a161288"></span> On target</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-8 h-4 rounded" style="background: rgba(217,85,85,0.35)"></span> Over-drawn</span>
          <span class="ml-auto italic">Expected: King 20% · Knight 20% · Goblin 40% · Lord 20%</span>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <RoleDetailModal v-if="detailRole" :role="detailRole" @close="closeDetail" />
    </Teleport>
  </ChartCard>
</template>

<style scoped>
.role-header-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  font-family: 'Cinzel', serif;
  font-size: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  transition: background 0.15s, transform 0.15s;
}
.role-header-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  transform: translateY(-2px);
}

.role-portrait-thumb {
  width: clamp(56px, 7vw, 96px);
  aspect-ratio: 1 / 1;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5));
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}
</style>
