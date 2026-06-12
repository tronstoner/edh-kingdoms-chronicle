<script setup>
import { computed, ref } from 'vue'
import ChartCard from './ChartCard.vue'
import RoleDetailModal from './RoleDetailModal.vue'
import { ROLE_COLORS, rolePortraitUrl } from '../roles.js'
import { computePlayerRoleWinLossCurves } from '../analysis.js'

const props = defineProps({ players: Array, games: { type: Array, default: () => [] } })

const roles = ['King', 'Knight', 'Goblin', 'Lord']
const mode = ref('winRate')

const PLAYER_COLORS = {
  Ralf: '#a47be0',
  Markus: '#5ba3d9',
  Hannes: '#6ab86a',
  Ivan: '#e2b84a',
  David: '#d95555',
  Leo: '#d98ec8',
  Mariusz: '#52bfbf',
}

const sortedPlayers = computed(() =>
  [...props.players].sort((a, b) =>
    (b.wins ?? 0) - (a.wins ?? 0) ||
    (b.winRate ?? 0) - (a.winRate ?? 0)
  )
)

const SPARK_W = 100
const SPARK_H = 36
const SPARK_PAD = 1 // half of the thickest stroke — keeps the line fully visible at the edges

const playerCurves = computed(() => {
  const map = {}
  for (const p of props.players) {
    map[p.name] = computePlayerRoleWinLossCurves(props.games, p.name)
  }
  return map
})

const playerRoleTallies = computed(() => {
  const normalize = r => r === 'Clone Lord' ? 'Lord' : r
  const map = {}
  for (const p of props.players) {
    map[p.name] = { King: { w: 0, l: 0 }, Knight: { w: 0, l: 0 }, Goblin: { w: 0, l: 0 }, Lord: { w: 0, l: 0 } }
  }
  for (const game of props.games) {
    for (const entry of game.players) {
      const t = map[entry.player]
      if (!t || !entry.role) continue
      const role = normalize(entry.role)
      if (!t[role]) continue
      if (entry.result === 'Win') t[role].w++
      else t[role].l++
    }
  }
  return map
})

function getRoleTally(player, role) {
  return playerRoleTallies.value[player.name]?.[role] || { w: 0, l: 0 }
}

function sparkPath(player, role) {
  const curve = playerCurves.value[player.name]?.[role]
  if (!curve || curve.length < 2) return null
  // Only keep points where this role was actually played
  // (cumulative W-L only changes on those games — flat runs add no signal).
  const points = []
  let prevY = null
  for (let i = 0; i < curve.length; i++) {
    if (curve[i].y !== prevY || i === curve.length - 1) {
      points.push({ i, y: curve[i].y })
      prevY = curve[i].y
    }
  }
  if (points.length < 2) return null
  const ys = curve.map(p => p.y)
  const min = Math.min(0, ...ys)
  const max = Math.max(0, ...ys)
  const range = max - min || 1
  const n = curve.length - 1
  const toX = i => (i / n) * SPARK_W
  const toY = y => SPARK_H - SPARK_PAD - ((y - min) / range) * (SPARK_H - 2 * SPARK_PAD)
  const d = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${toX(p.i).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ')
  const zeroY = toY(0)
  return { d, zeroY, color: ROLE_COLORS[role] }
}

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
  return { backgroundColor: `rgba(201, 165, 78, ${alpha})`, color: '#f5e9c8' }
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
          <tr v-for="p in sortedPlayers" :key="p.name" class="border-b border-mtg-border/40">
            <td class="py-3 pr-6 font-beleren text-lg">
              <router-link
                :to="'/player/' + p.name"
                class="no-underline hover:underline transition-colors"
                :style="{ color: PLAYER_COLORS[p.name] }"
              >{{ p.name }}</router-link>
            </td>

            <!-- Win Rate mode -->
            <template v-if="mode === 'winRate'">
              <td v-for="r in roles" :key="r" class="text-center py-3 px-2">
                <div
                  v-if="getRoleData(p, r).games"
                  class="wr-cell rounded-lg px-3 py-2 text-center border border-mtg-border/30 font-beleren"
                  :style="winRateCellStyle(getRoleData(p, r).winRate)"
                >
                  <svg
                    v-if="sparkPath(p, r)"
                    class="wr-spark"
                    :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line
                      x1="0" :y1="sparkPath(p, r).zeroY"
                      x2="100" :y2="sparkPath(p, r).zeroY"
                      stroke="#000000" stroke-width="0.7"
                      stroke-opacity="0.5"
                      stroke-dasharray="3 2"
                    />
                    <path
                      :d="sparkPath(p, r).d"
                      fill="none"
                      :stroke="sparkPath(p, r).color"
                      stroke-opacity="0.55"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <div class="wr-content">
                    <div class="text-lg leading-tight">{{ pct(getRoleData(p, r).winRate) }}</div>
                    <div class="text-xs font-body tabular-nums leading-tight">
                      {{ getRoleTally(p, r).w }}W · {{ getRoleTally(p, r).l }}L
                    </div>
                    <div class="text-xs font-body leading-tight">{{ getRoleData(p, r).games }} games</div>
                  </div>
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
.wr-cell {
  position: relative;
  overflow: hidden;
  min-width: 86px;
}
.wr-spark {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.wr-content {
  position: relative;
}

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
