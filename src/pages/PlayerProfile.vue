<script setup>
import { inject, computed } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import ChartCard from '../components/ChartCard.vue'
import { colorIcons } from '../mana.js'
import {
  computeRoleDistribution,
  computeDeckDiversity,
  computeNemesis,
  computeBestPartner,
  computeStreaks,
  computeZombieStats,
  computePlayerGames,
  computeWinLossCurve,
  computePlayerRoleWinLossCurves,
  computePlayerRoleOverTime,
} from '../analysis.js'
import WinRateCurve from '../components/WinRateCurve.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps({ name: String })
const data = inject('data')

const player = computed(() =>
  data.value.players.find(p => p.name === props.name)
)

const playerGames = computed(() =>
  computePlayerGames(data.value.games, props.name)
)

const roleDist = computed(() =>
  computeRoleDistribution(data.value.games, props.name)
)

const deckDiv = computed(() =>
  computeDeckDiversity(data.value.games, props.name)
)

const nemesisData = computed(() =>
  computeNemesis(data.value.games, props.name)
)

const partnerData = computed(() =>
  computeBestPartner(data.value.games, props.name)
)

const streaks = computed(() =>
  computeStreaks(data.value.games, props.name)
)

const zombieStats = computed(() =>
  computeZombieStats(data.value.games, props.name)
)

const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
}

const roleChartData = computed(() => ({
  labels: roleDist.value.map(r => r.role),
  datasets: [{
    data: roleDist.value.map(r => r.count),
    backgroundColor: roleDist.value.map(r => ROLE_COLORS[r.role]),
    borderColor: '#231f1a',
    borderWidth: 3,
  }],
}))

const roleChartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#d4c8a8', font: { family: 'Cinzel', size: 13 }, padding: 16 },
    },
  },
}

const deckChartData = computed(() => {
  const top = deckDiv.value.decks
  return {
    labels: top.map(d => d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name),
    datasets: [
      {
        label: 'Wins',
        data: top.map(d => d.wins),
        backgroundColor: '#c9a54e',
        borderRadius: 4,
      },
      {
        label: 'Losses',
        data: top.map(d => d.games - d.wins),
        backgroundColor: '#c9a54e33',
        borderRadius: 4,
      },
    ],
  }
})

const deckChartOptions = {
  indexAxis: 'y',
  responsive: true,
  plugins: {
    legend: { labels: { color: '#d4c8a8', font: { family: 'EB Garamond', size: 13 } } },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 14 },
      bodyFont: { family: 'EB Garamond', size: 14 },
    },
  },
  scales: {
    x: { stacked: true, ticks: { color: '#8a7e66', font: { family: 'EB Garamond' } }, grid: { color: '#3d352933' } },
    y: { stacked: true, ticks: { color: '#d4c8a8', font: { family: 'EB Garamond', size: 12 } }, grid: { display: false } },
  },
}

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + '%' : '-'
}

function matchupRate(opp) {
  return opp.gamesShared > 0 ? opp.myWins / opp.gamesShared : 0
}

const ROLE_ORDER = { King: 0, Knight: 1, Goblin: 2, Lord: 3, 'Clone Lord': 4 }

function sortByRole(players) {
  return [...players].sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))
}

const ROLE_STYLE = {
  King: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  Knight: 'bg-green-900/30 text-green-300 border-green-700/40',
  Goblin: 'bg-red-900/30 text-red-300 border-red-700/40',
  Lord: 'bg-purple-900/30 text-purple-300 border-purple-700/40',
}

const recentGames = computed(() =>
  [...playerGames.value].reverse().slice(0, 15)
)

const winRateCurve = computed(() =>
  computeWinLossCurve(data.value.games, { playerName: props.name })
)

const roleCurves = computed(() =>
  computePlayerRoleWinLossCurves(data.value.games, props.name)
)

const ROLES_FOR_CURVE = ['King', 'Knight', 'Goblin', 'Lord']

const roleCurvesChartData = computed(() => {
  const curves = roleCurves.value
  const len = curves.King.length
  const labels = Array.from({ length: len }, (_, i) => i + 1)
  return {
    labels,
    datasets: ROLES_FOR_CURVE.map(role => ({
      label: role,
      data: curves[role].map(p => p.y),
      borderColor: ROLE_COLORS[role],
      backgroundColor: 'transparent',
      tension: 0,
      pointRadius: len > 30 ? 0 : 3,
      pointHoverRadius: 5,
      borderWidth: 2.5,
    })),
  }
})

const roleCurvesChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#d4c8a8', font: { family: 'Cinzel', size: 12 }, padding: 14 } },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 13 },
      bodyFont: { family: 'EB Garamond', size: 13 },
      callbacks: {
        title: (items) => {
          const i = items[0]?.dataIndex
          const date = roleCurves.value.King[i]?.date
          return date ? `Game ${i + 1} — ${date}` : `Game ${i + 1}`
        },
        label: (item) => ` ${item.dataset.label}: ${item.raw > 0 ? '+' : ''}${item.raw}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 11 }, maxTicksLimit: 10 },
      grid: { color: '#3d352922' },
      title: { display: true, text: 'Game #', color: '#8a7e66', font: { family: 'EB Garamond', size: 11 } },
    },
    y: {
      ticks: {
        color: '#8a7e66',
        font: { family: 'EB Garamond', size: 11 },
        callback: v => v > 0 ? `+${v}` : `${v}`,
      },
      grid: { color: '#3d352933' },
      title: { display: true, text: 'Cumulative W−L', color: '#c9a54e', font: { family: 'Cinzel', size: 12 } },
    },
  },
}))

const EXPECTED_RATE = { King: 0.20, Knight: 0.20, Goblin: 0.40, Lord: 0.20 }

const roleResultTallies = computed(() => {
  const normalize = r => r === 'Clone Lord' ? 'Lord' : r
  const tally = { King: { w: 0, l: 0 }, Knight: { w: 0, l: 0 }, Goblin: { w: 0, l: 0 }, Lord: { w: 0, l: 0 } }
  for (const game of playerGames.value) {
    const entry = game.players.find(p => p.player === props.name)
    if (!entry?.role) continue
    const role = normalize(entry.role)
    if (!tally[role]) continue
    if (entry.result === 'Win') tally[role].w++
    else tally[role].l++
  }
  return tally
})

const roleStats = computed(() =>
  roleDist.value.map(r => {
    const key = r.role.toLowerCase()
    const winRate = player.value?.[key + 'WinRate'] ?? null
    const deviation = r.pct - (EXPECTED_RATE[r.role] ?? 0)
    const t = roleResultTallies.value[r.role] || { w: 0, l: 0 }
    return { ...r, winRate, deviation, wins: t.w, losses: t.l }
  })
)

function winRateBadgeClass(wr) {
  if (wr == null) return 'text-mtg-text-dim/50'
  if (wr >= 0.66) return 'text-mtg-dark bg-mtg-gold ring-1 ring-mtg-gold/60'
  if (wr >= 0.50) return 'text-mtg-gold bg-mtg-gold/20 ring-1 ring-mtg-gold/40'
  if (wr >= 0.33) return 'text-amber-200 bg-amber-900/30 ring-1 ring-amber-700/30'
  if (wr >= 0.15) return 'text-mtg-text bg-mtg-dark/60 ring-1 ring-mtg-border/40'
  return 'text-red-300 bg-red-900/20 ring-1 ring-red-800/30'
}

function deviationClass(dev) {
  const d = dev * 100
  if (Math.abs(d) < 3) return 'text-mtg-text-dim'
  if (d > 10) return 'text-red-400'
  if (d > 0) return 'text-orange-400'
  if (d < -10) return 'text-blue-400'
  return 'text-blue-300/70'
}

// One entry per session date the player was present, in game order
const sessionRoles = computed(() => {
  const normalize = r => r === 'Clone Lord' ? 'Lord' : r
  const dateMap = {}
  const dates = []
  for (const game of playerGames.value) {
    if (!dates.includes(game.date)) dates.push(game.date)
    if (!dateMap[game.date]) dateMap[game.date] = { King: 0, Knight: 0, Goblin: 0, Lord: 0 }
    const entry = game.players.find(p => p.player === props.name)
    if (entry?.role) {
      const role = normalize(entry.role)
      if (role in dateMap[game.date]) dateMap[game.date][role]++
    }
  }
  return dates.map(date => ({ date, counts: dateMap[date] }))
})

function sessionPct(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (!total) return { King: 0, Knight: 0, Goblin: 0, Lord: 0 }
  return Object.fromEntries(
    Object.entries(counts).map(([r, c]) => [r, parseFloat(((c / total) * 100).toFixed(1))])
  )
}

const roleHistoryChartData = computed(() => ({
  labels: sessionRoles.value.map(s => s.date),
  datasets: ['Lord', 'Goblin', 'Knight', 'King'].map(role => ({
    label: role,
    data: sessionRoles.value.map(s => sessionPct(s.counts)[role]),
    backgroundColor: ROLE_COLORS[role],
    borderWidth: 0,
  })),
}))

// Per-game rolling window for role bias line chart
const roleTimeline = computed(() =>
  computePlayerRoleOverTime(data.value.games, props.name)
)

// Expected cumulative thresholds (Lord bottom → King top): 20 / 60 / 80
// Used as dashed reference lines inside the stacked area chart
const IDEAL_LINES = [
  { label: '_lord_ref',   value: 20,  color: 'rgba(0, 0, 0, 0.5)' },
  { label: '_goblin_ref', value: 60,  color: 'rgba(0, 0, 0, 0.5)' },
  { label: '_knight_ref', value: 80,  color: 'rgba(0, 0, 0, 0.5)' },
]

const roleTimelineChartData = computed(() => {
  const n = roleTimeline.value.length
  return {
    labels: roleTimeline.value.map(p => p.x),
    datasets: [
      // Stacked area layers — Lord at bottom, King on top
      ...['Lord', 'Goblin', 'Knight', 'King'].map(role => ({
        label: role,
        data: roleTimeline.value.map(p => p[role]),
        backgroundColor: ROLE_COLORS[role],
        borderColor: ROLE_COLORS[role],
        borderWidth: 1,
        fill: true,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 1,
      })),
      // Ideal reference lines — drawn on top of the areas
      ...IDEAL_LINES.map(({ label, value, color }) => ({
        label,
        data: Array(n).fill(value),
        borderColor: color,
        borderDash: [6, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0,
        yAxisID: 'yRef',
        order: 0,
      })),
    ],
  }
})

const roleTimelineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: {
        color: '#d4c8a8',
        font: { family: 'Cinzel', size: 11 },
        padding: 12,
        filter: item => !item.text.startsWith('_'),
        reverse: true,
      },
    },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 13 },
      bodyFont: { family: 'EB Garamond', size: 13 },
      filter: item => !item.dataset.label.startsWith('_'),
      callbacks: {
        title: (items) => roleTimeline.value[items[0]?.dataIndex]?.date || `Game ${items[0]?.dataIndex + 1}`,
        label: (item) => ` ${item.dataset.label}: ${item.raw.toFixed(0)}%`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 11 }, maxTicksLimit: 12 },
      grid: { color: '#3d352922' },
      title: { display: true, text: 'Game #', color: '#8a7e66', font: { family: 'EB Garamond', size: 11 } },
    },
    y: {
      stacked: true,
      min: 0,
      max: 100,
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 11 }, callback: v => v + '%' },
      grid: { color: '#3d352933' },
    },
    yRef: {
      display: false,
      min: 0,
      max: 100,
      stacked: false,
    },
  },
}

const roleHistoryChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#d4c8a8', font: { family: 'Cinzel', size: 11 }, padding: 12, reverse: true } },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 13 },
      bodyFont: { family: 'EB Garamond', size: 13 },
      callbacks: {
        title: (items) => sessionRoles.value[items[0]?.dataIndex]?.date,
        label: (item) => {
          const count = sessionRoles.value[item.dataIndex]?.counts[item.dataset.label] ?? 0
          return count > 0 ? ` ${item.dataset.label}: ${count}×` : null
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 11 }, maxRotation: 45 },
      grid: { color: '#3d352922' },
    },
    y: {
      stacked: true,
      min: 0,
      max: 100,
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 11 }, callback: v => v + '%' },
      grid: { color: '#3d352933' },
    },
  },
}
</script>

<template>
  <div v-if="!player" class="flex items-center justify-center h-64">
    <div class="text-mtg-text-dim font-beleren text-xl">Champion "{{ name }}" not found</div>
  </div>

  <div v-else>
    <!-- Back link -->
    <router-link to="/dashboard" class="inline-flex items-center gap-2 text-mtg-text-dim hover:text-mtg-gold transition-colors mb-6 font-body no-underline">
      &larr; Back to Dashboard
    </router-link>

    <!-- Player header -->
    <div class="bg-mtg-card border-2 border-mtg-border rounded-xl p-6 mb-8">
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-start">
        <!-- Player stats -->
        <div>
          <h2 class="text-4xl font-beleren text-mtg-gold tracking-wide mb-5">{{ player.name }}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ player.games }}</div>
              <div class="text-sm text-mtg-text-dim">Games</div>
            </div>
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ player.wins }}</div>
              <div class="text-sm text-mtg-text-dim">Wins</div>
            </div>
            <div>
              <div class="text-2xl font-beleren" :class="(player.winRate ?? 0) >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text'">{{ pct(player.winRate) }}</div>
              <div class="text-sm text-mtg-text-dim">Win Rate</div>
            </div>
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ streaks.longestWinStreak }}</div>
              <div class="text-sm text-mtg-text-dim">Best Streak</div>
            </div>
            <div>
              <div class="text-2xl font-beleren" :class="streaks.currentStreakType === 'W' ? 'text-mtg-gold' : 'text-mtg-text-dim'">
                {{ streaks.currentStreak }}{{ streaks.currentStreakType }}
              </div>
              <div class="text-sm text-mtg-text-dim">Current</div>
            </div>
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ streaks.last10Wins }}/{{ streaks.last10Total }}</div>
              <div class="text-sm text-mtg-text-dim">Last 10</div>
            </div>
          </div>
          <div v-if="zombieStats.timesUndead > 0 || zombieStats.playersRaised > 0" class="mt-4 pt-4 border-t border-mtg-border/50 flex flex-wrap gap-5 text-sm font-body">
            <span v-if="zombieStats.timesZombified > 0" class="flex items-center gap-1.5 text-mtg-text-dim" title="Turned into Zombie by a Lord">
              &#x1F9DF; Zombified {{ zombieStats.timesZombified }}x
            </span>
            <span v-if="zombieStats.timesCloned > 0" class="flex items-center gap-1.5 text-mtg-text-dim" title="Turned into Clone by a Clone Lord">
              &#x1F9EC; Cloned {{ zombieStats.timesCloned }}x
            </span>
            <span v-if="zombieStats.playersRaised > 0" class="flex items-center gap-1.5 text-mtg-text-dim" title="Players raised as minions while playing Lord">
              &#x2620;&#xFE0F; Raised {{ zombieStats.playersRaised }} minion{{ zombieStats.playersRaised !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- Separator -->
        <div class="hidden lg:block w-px bg-mtg-border self-stretch"></div>

        <!-- Role Distribution -->
        <div>
          <h3 class="font-beleren text-lg text-mtg-gold-light mb-4">Role Performance</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div class="h-48 flex items-center justify-center">
              <Doughnut :data="roleChartData" :options="{ ...roleChartOptions, maintainAspectRatio: false }" />
            </div>
            <div class="space-y-2">
              <div
                v-for="r in roleStats"
                :key="r.role"
                class="flex items-center gap-3 rounded-lg pl-2 pr-1 py-1.5 border border-mtg-border/40"
                :style="{ background: `linear-gradient(90deg, ${ROLE_COLORS[r.role]}1a 0%, transparent 60%)` }"
              >
                <span class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ backgroundColor: ROLE_COLORS[r.role] }"></span>
                <div class="flex-1 min-w-0">
                  <div class="font-beleren text-sm leading-tight" :style="{ color: ROLE_COLORS[r.role] }">{{ r.role }}</div>
                  <div class="text-xs text-mtg-text-dim font-body leading-tight tabular-nums">
                    <span class="text-mtg-gold">{{ r.wins }}W</span>
                    <span class="mx-0.5">·</span>
                    <span>{{ r.losses }}L</span>
                    <span class="mx-1 text-mtg-text-dim/50">|</span>
                    <span :class="deviationClass(r.deviation)">{{ r.deviation >= 0 ? '+' : '' }}{{ (r.deviation * 100).toFixed(0) }}%</span>
                  </div>
                </div>
                <div
                  class="font-beleren text-xl tabular-nums px-2.5 py-1 rounded-md min-w-[64px] text-right"
                  :class="winRateBadgeClass(r.winRate)"
                >
                  {{ r.winRate != null ? (r.winRate * 100).toFixed(0) + '%' : '—' }}
                </div>
              </div>
              <div class="text-[11px] text-mtg-text-dim/60 font-body italic text-right pt-1">
                Win rate — ideal in a 5p game is 33%.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Win Rate History -->
    <ChartCard class="mb-8">
      <template #title>Win Rate Over Time</template>
      <WinRateCurve :curve-data="winRateCurve" />
    </ChartCard>

    <!-- Cumulative W-L per role -->
    <ChartCard v-if="playerGames.length >= 2" class="mb-8">
      <template #title>Allegiance Fortunes</template>
      <p class="text-sm text-mtg-text-dim font-body mb-3">Cumulative W−L per role across this champion's games.</p>
      <div class="h-72">
        <Line :data="roleCurvesChartData" :options="roleCurvesChartOptions" />
      </div>
    </ChartCard>

    <!-- Role History -->
    <ChartCard v-if="playerGames.length >= 3" class="mb-8">
      <template #title>Roles per Game Night</template>
      <div class="h-44">
        <Bar :data="roleHistoryChartData" :options="{ ...roleHistoryChartOptions, maintainAspectRatio: false }" />
      </div>

      <div class="mt-6 border-t border-mtg-border/50 pt-5">
        <h3 class="font-beleren text-base text-mtg-gold-light mb-1">Role Bias</h3>
        <p class="text-sm text-mtg-text-dim font-body mb-4">Rolling 10-game window. Dashed lines show the expected draw rate for each role.</p>
        <div class="h-52">
          <Line :data="roleTimelineChartData" :options="{ ...roleTimelineChartOptions, maintainAspectRatio: false }" />
        </div>
      </div>
    </ChartCard>

    <div class="space-y-8 mb-8">
      <!-- Matchups -->
      <ChartCard>
        <template #title>Matchups</template>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div v-if="nemesisData.nemesis" class="bg-red-950/20 border border-red-900/30 rounded-lg p-4 text-center">
            <div class="text-xs text-red-400/70 font-body uppercase tracking-wider mb-1">Nemesis</div>
            <router-link :to="'/player/' + nemesisData.nemesis.name" class="font-beleren text-xl text-red-400 no-underline hover:underline">
              {{ nemesisData.nemesis.name }}
            </router-link>
            <div class="text-sm text-mtg-text-dim font-body mt-1">
              wins {{ pct(nemesisData.nemesis.theirWins / nemesisData.nemesis.gamesShared) }} when present
            </div>
          </div>
          <div v-if="partnerData.best" class="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4 text-center">
            <div class="text-xs text-blue-400/70 font-body uppercase tracking-wider mb-1">Trusted Ally</div>
            <router-link :to="'/player/' + partnerData.best.name" class="font-beleren text-xl text-blue-400 no-underline hover:underline">
              {{ partnerData.best.name }}
            </router-link>
            <div class="text-sm text-mtg-text-dim font-body mt-1">
              {{ partnerData.best.wins }}W/{{ partnerData.best.games }}G ({{ pct(partnerData.best.winRate) }})
            </div>
          </div>
          <div v-if="partnerData.worst && partnerData.worst.name !== partnerData.best?.name" class="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4 text-center">
            <div class="text-xs text-amber-400/70 font-body uppercase tracking-wider mb-1">Cursed Ally</div>
            <router-link :to="'/player/' + partnerData.worst.name" class="font-beleren text-xl text-amber-400 no-underline hover:underline">
              {{ partnerData.worst.name }}
            </router-link>
            <div class="text-sm text-mtg-text-dim font-body mt-1">
              {{ partnerData.worst.wins }}W/{{ partnerData.worst.games }}G ({{ pct(partnerData.worst.winRate) }})
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8">
          <!-- Opponents -->
          <div>
            <h3 class="font-beleren text-lg text-mtg-gold-light mb-3">Opponents</h3>
            <div class="space-y-2">
              <div class="flex items-center text-sm text-mtg-gold-light font-beleren tracking-wider uppercase mb-2">
                <span class="flex-1">Player</span>
                <span class="w-16 text-right">Games</span>
                <span class="w-16 text-right">My WR</span>
                <span class="w-16 text-right">Their</span>
              </div>
              <div
                v-for="opp in nemesisData.opponents.sort((a, b) => matchupRate(b) - matchupRate(a))"
                :key="opp.name"
                class="flex items-center py-2 border-b border-mtg-border/30"
              >
                <router-link :to="'/player/' + opp.name" class="flex-1 font-beleren text-base text-mtg-text no-underline hover:text-mtg-gold transition-colors">
                  {{ opp.name }}
                </router-link>
                <span class="w-16 text-right text-base text-mtg-text-dim font-body">{{ opp.gamesShared }}</span>
                <span class="w-16 text-right text-base font-body" :class="matchupRate(opp) >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text-dim'">
                  {{ pct(matchupRate(opp)) }}
                </span>
                <span class="w-16 text-right text-base font-body text-mtg-text-dim">
                  {{ pct(opp.theirWins / opp.gamesShared) }}
                </span>
              </div>
            </div>
            <p class="text-sm text-mtg-text-dim italic font-body mt-3">
              My WR = win rate when opponent is present.
            </p>
          </div>

          <!-- Separator -->
          <div class="hidden lg:block w-px bg-mtg-border"></div>

          <!-- Team partners -->
          <div v-if="partnerData.partners.length">
            <h3 class="font-beleren text-lg text-mtg-gold-light mb-3">Team Partners</h3>
            <div class="space-y-2">
              <div class="flex items-center text-sm text-mtg-gold-light font-beleren tracking-wider uppercase mb-2">
                <span class="flex-1">Ally</span>
                <span class="flex-1 text-right">Type</span>
                <span class="w-16 text-right">Games</span>
                <span class="w-16 text-right">WR</span>
              </div>
              <div
                v-for="p in partnerData.partners"
                :key="p.name"
                class="flex items-center py-2 border-b border-mtg-border/30"
              >
                <router-link :to="'/player/' + p.name" class="flex-1 font-beleren text-base text-mtg-text no-underline hover:text-mtg-gold transition-colors">
                  {{ p.name }}
                </router-link>
                <span class="flex-1 text-right text-sm text-mtg-text-dim font-body">
                  <span v-if="p.asGoblin">{{ p.asGoblin }} Goblin</span>
                  <span v-if="p.asGoblin && p.asKingKnight"> / </span>
                  <span v-if="p.asKingKnight">{{ p.asKingKnight }} K&#x2194;Kn</span>
                </span>
                <span class="w-16 text-right text-base text-mtg-text-dim font-body">{{ p.games }}</span>
                <span class="w-16 text-right text-base font-body" :class="p.winRate >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text-dim'">
                  {{ pct(p.winRate) }}
                </span>
              </div>
            </div>
            <p class="text-sm text-mtg-text-dim italic font-body mt-3">
              Goblin teammates and King/Knight pairs.
            </p>
          </div>
        </div>
      </ChartCard>
    </div>

    <!-- Deck Diversity -->
    <ChartCard class="mb-8">
      <template #title>Grimoire Arsenal ({{ deckDiv.totalDecks }} decks)</template>
      <div :style="{ height: Math.max(200, deckDiv.decks.length * 30) + 'px' }">
        <Bar :data="deckChartData" :options="{ ...deckChartOptions, maintainAspectRatio: false }" />
      </div>
      <div class="mt-5 overflow-x-auto">
        <table class="w-full font-body text-sm">
          <thead>
            <tr class="text-mtg-gold-light border-b-2 border-mtg-border">
              <th class="text-left py-2 pr-3 font-beleren text-xs tracking-wider uppercase">Deck</th>
              <th class="text-center py-2 px-2 font-beleren text-xs tracking-wider uppercase">Colors</th>
              <th class="text-right py-2 px-2 font-beleren text-xs tracking-wider uppercase">Games</th>
              <th class="text-right py-2 px-2 font-beleren text-xs tracking-wider uppercase">W/L</th>
              <th class="text-right py-2 pl-2 font-beleren text-xs tracking-wider uppercase">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in deckDiv.decks" :key="d.name" class="border-b border-mtg-border/40 hover:bg-mtg-gold/5">
              <td class="py-2 pr-3 font-beleren">
                <router-link :to="'/deck/' + d.name" class="text-mtg-text hover:text-mtg-gold transition-colors no-underline hover:underline">{{ d.name }}</router-link>
              </td>
              <td class="py-2 px-2 text-center">
                <span class="inline-flex gap-0.5">
                  <i
                    v-for="c in colorIcons((data.decks.find(dd => dd.name === d.name) || {}).colors || '')"
                    :key="c.label"
                    :class="[c.icon, 'ms-cost', 'ms-shadow']"
                    class="text-sm"
                  ></i>
                </span>
              </td>
              <td class="text-right py-2 px-2 text-mtg-text-dim">{{ d.games }}</td>
              <td class="text-right py-2 px-2">
                <span class="text-mtg-gold">{{ d.wins }}</span><span class="text-mtg-text-dim">/{{ d.games - d.wins }}</span>
              </td>
              <td class="text-right py-2 pl-2">
                <span class="font-beleren" :class="d.games > 0 && d.wins / d.games >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text'">
                  {{ d.games > 0 ? pct(d.wins / d.games) : '-' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ChartCard>

    <!-- Recent games for this player -->
    <ChartCard>
      <template #title>Recent Battles</template>
      <div class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        <div
          v-for="(game, i) in recentGames"
          :key="i"
          class="bg-mtg-dark/70 rounded-lg p-4 border border-mtg-border"
        >
          <div class="flex items-center gap-3 mb-2">
            <span class="text-sm text-mtg-text-dim font-body italic">{{ game.date }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded border font-body"
              :class="ROLE_STYLE[game.players.find(p => p.player === name)?.role] || ''"
            >{{ game.players.find(p => p.player === name)?.role }}</span>
            <span
              class="font-beleren text-sm"
              :class="game.players.find(p => p.player === name)?.result === 'Win' ? 'text-mtg-gold' : 'text-mtg-text-dim'"
            >{{ game.players.find(p => p.player === name)?.result }}</span>
            <router-link
              v-if="game.players.find(p => p.player === name)?.deck"
              :to="'/deck/' + game.players.find(p => p.player === name).deck"
              class="text-sm text-mtg-text-dim/60 font-body ml-auto truncate max-w-xs no-underline hover:text-mtg-gold transition-colors"
            >{{ game.players.find(p => p.player === name)?.deck }}</router-link>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="p in sortByRole(game.players.filter(p => p.player !== name))"
              :key="p.player"
              class="text-xs font-body px-2 py-0.5 rounded border"
              :class="p.result === 'Win' ? 'bg-mtg-gold/10 border-mtg-gold/30 text-mtg-gold' : 'bg-mtg-dark/50 border-mtg-border/50 text-mtg-text-dim'"
            >
              <router-link :to="'/player/' + p.player" class="no-underline" :class="p.result === 'Win' ? 'text-mtg-gold' : 'text-mtg-text-dim'">{{ p.player }}</router-link>
              <span class="opacity-50 ml-1">{{ p.role }}</span>
            </span>
          </div>
        </div>
      </div>
    </ChartCard>
  </div>
</template>
