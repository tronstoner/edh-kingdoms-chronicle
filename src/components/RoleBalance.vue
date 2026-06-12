<script setup>
import { ref, computed } from 'vue'
import { Bar, Line } from 'vue-chartjs'

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import ChartCard from './ChartCard.vue'
import { computeRoleWinLossCurves, computeFactionWinShareCurves } from '../analysis.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps({ roles: Array, games: Array })


const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
}

const chartData = computed(() => ({
  labels: props.roles.map(r => r.name),
  datasets: [
    {
      label: 'Wins',
      data: props.roles.map(r => r.wins),
      backgroundColor: props.roles.map(r => ROLE_COLORS[r.name]),
      borderRadius: 6,
    },
    {
      label: 'Losses',
      data: props.roles.map(r => r.losses),
      backgroundColor: props.roles.map(r => (ROLE_COLORS[r.name] || '#888') + '33'),
      borderRadius: 6,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { labels: { color: '#d4c8a8', font: { family: 'EB Garamond', size: 14 } } },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 14 },
      bodyFont: { family: 'EB Garamond', size: 14 },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#d4c8a8', font: { family: 'Cinzel', size: 14 } },
      grid: { color: '#3d352922' },
    },
    y: {
      stacked: true,
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 13 } },
      grid: { color: '#3d352944' },
    },
  },
}

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + '%' : '-'
}

const factionCurves = computed(() =>
  props.games ? computeFactionWinShareCurves(props.games) : []
)

// Ideal reference boundaries: Lord at 33%, Lord+Goblin at 66%
const FACTION_IDEAL_LINES = [
  { label: '_lord_ref',   value: 20, color: 'rgba(0, 0, 0, 0.5)' },
  { label: '_goblin_ref', value: 60, color: 'rgba(0, 0, 0, 0.5)' },
]

const factionChartData = computed(() => {
  const n = factionCurves.value.length
  return {
    labels: factionCurves.value.map(p => p.x),
    datasets: [
      // Stacked areas — Lord at bottom, King on top
      { label: 'Lord',   data: factionCurves.value.map(p => p.Lord),   backgroundColor: '#a47be0', borderColor: '#a47be0', borderWidth: 1, fill: true, tension: 0, pointRadius: 0, order: 1 },
      { label: 'Goblin', data: factionCurves.value.map(p => p.Goblin), backgroundColor: '#d95555', borderColor: '#d95555', borderWidth: 1, fill: true, tension: 0, pointRadius: 0, order: 1 },
      { label: 'Knight', data: factionCurves.value.map(p => p.Knight), backgroundColor: '#6ab86a', borderColor: '#6ab86a', borderWidth: 1, fill: true, tension: 0, pointRadius: 0, order: 1 },
      { label: 'King',   data: factionCurves.value.map(p => p.King),   backgroundColor: '#e2b84a', borderColor: '#e2b84a', borderWidth: 1, fill: true, tension: 0, pointRadius: 0, order: 1 },
      // Ideal reference lines on separate non-stacked axis
      ...FACTION_IDEAL_LINES.map(({ label, value, color }) => ({
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

const factionChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: {
        color: '#d4c8a8',
        font: { family: 'Cinzel', size: 12 },
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
        title: (items) => {
          const idx = items[0]?.dataIndex
          return factionCurves.value[idx]?.date || `Game ${idx + 1}`
        },
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

const roleCurves = computed(() =>
  props.games ? computeRoleWinLossCurves(props.games) : { King: [], Knight: [], Goblin: [], Lord: [] }
)

const fortuneMode = ref('rate')

const fortuneChartData = computed(() => {
  const roles = ['King', 'Knight', 'Goblin', 'Lord']
  const n = props.games?.length || 0
  const baseline = fortuneMode.value === 'delta' ? 0 : 50
  return {
    labels: Array.from({ length: n }, (_, i) => i + 1),
    datasets: [
      ...roles.map(role => ({
        label: role,
        data: roleCurves.value[role].map(p => fortuneMode.value === 'delta' ? p.y : p.rate),
        borderColor: ROLE_COLORS[role],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0,
        fill: false,
      })),
      {
        label: '_baseline',
        data: Array(n).fill(baseline),
        borderColor: '#8a7e66',
        borderWidth: 1,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        tension: 0,
      },
    ],
  }
})

const fortuneChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: {
        color: '#d4c8a8',
        font: { family: 'Cinzel', size: 12 },
        filter: item => item.text !== '_baseline',
      },
    },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 13 },
      bodyFont: { family: 'EB Garamond', size: 13 },
      filter: item => item.dataset.label !== '_baseline',
      callbacks: {
        title: (items) => {
          const idx = items[0]?.dataIndex
          return roleCurves.value.King[idx]?.date || `Game ${idx + 1}`
        },
        label: (item) => fortuneMode.value === 'delta'
          ? ` ${item.dataset.label}: ${item.raw > 0 ? '+' : ''}${item.raw}`
          : ` ${item.dataset.label}: ${item.raw}%`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 11 }, maxTicksLimit: 12 },
      grid: { color: '#3d352922' },
      title: { display: true, text: 'Game #', color: '#8a7e66', font: { family: 'EB Garamond', size: 11 } },
    },
    y: {
      ...(fortuneMode.value === 'rate' ? { min: 0, max: 100 } : {}),
      ticks: {
        color: '#8a7e66',
        font: { family: 'EB Garamond', size: 11 },
        callback: v => fortuneMode.value === 'delta' ? (v > 0 ? `+${v}` : `${v}`) : `${v}%`,
      },
      grid: { color: '#3d352933' },
    },
  },
}))
</script>

<template>
  <ChartCard>
    <template #title>Allegiance Balance</template>
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <div class="lg:col-span-3 h-72">
        <Bar :data="chartData" :options="{ ...chartOptions, maintainAspectRatio: false }" />
      </div>
      <div class="lg:col-span-2 space-y-4">
        <div v-for="r in roles" :key="r.name" class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-beleren text-lg" :style="{ color: ROLE_COLORS[r.name] }">{{ r.name }}</span>
            <span class="font-beleren text-lg" :style="{ color: ROLE_COLORS[r.name] }">{{ pct(r.winRate) }}</span>
          </div>
          <div class="bg-mtg-dark rounded-full h-4 overflow-hidden border border-mtg-border">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{ width: ((r.winRate ?? 0) * 100) + '%', backgroundColor: ROLE_COLORS[r.name] }"
            ></div>
          </div>
          <div class="text-sm text-mtg-text-dim font-body">
            {{ r.wins }} wins / {{ r.losses }} losses
          </div>
        </div>
      </div>
    </div>

    <!-- Role Fortune Over Time -->
    <div class="mt-6 border-t border-mtg-border/50 pt-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-beleren text-base text-mtg-gold-light">Allegiance Mastery Over Time</h3>
        <div class="inline-flex rounded-lg border border-mtg-border overflow-hidden text-xs font-beleren">
          <button
            @click="fortuneMode = 'rate'"
            class="px-3 py-1 transition-colors"
            :class="fortuneMode === 'rate' ? 'bg-mtg-gold text-mtg-dark' : 'bg-mtg-dark text-mtg-text-dim hover:text-mtg-text'"
          >Win Rate %</button>
          <button
            @click="fortuneMode = 'delta'"
            class="px-3 py-1 transition-colors border-l border-mtg-border"
            :class="fortuneMode === 'delta' ? 'bg-mtg-gold text-mtg-dark' : 'bg-mtg-dark text-mtg-text-dim hover:text-mtg-text'"
          >Cumulative</button>
        </div>
      </div>
      <div class="h-56">
        <Line :data="fortuneChartData" :options="fortuneChartOptions" />
      </div>
    </div>

    <!-- Faction Win Share -->
    <div v-if="factionCurves.length >= 5" class="mt-6 border-t border-mtg-border/50 pt-5">
      <h3 class="font-beleren text-base text-mtg-gold-light mb-1">Faction Win Share</h3>
      <p class="text-sm text-mtg-text-dim font-body mb-4">Rolling 10-game window. Share of wins per faction. Dashed lines mark ideal: Lord 20%, Goblin 40%, King+Knight 40%.</p>
      <div class="h-56">
        <Line :data="factionChartData" :options="{ ...factionChartOptions, maintainAspectRatio: false }" />
      </div>
    </div>
  </ChartCard>
</template>
