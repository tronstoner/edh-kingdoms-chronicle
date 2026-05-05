<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js'
import ChartCard from './ChartCard.vue'
import { computeLordRecruitAnalysis } from '../analysis.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({ roles: Array, games: Array })

const recruitData = computed(() =>
  props.games ? computeLordRecruitAnalysis(props.games) : []
)

const totalRecruits = computed(() =>
  recruitData.value.reduce((sum, r) => sum + r.recruited, 0)
)

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

    <!-- Lord Recruit Analysis -->
    <div v-if="recruitData.length" class="mt-6 border-t border-mtg-border/50 pt-5">
      <h3 class="font-beleren text-base text-mtg-gold-light mb-3">Lord's Zombie Recruits</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="r in recruitData"
          :key="r.role"
          class="bg-mtg-dark/70 border border-mtg-border rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="font-beleren text-base" :style="{ color: ROLE_COLORS[r.role] || '#8a7e66' }">{{ r.role }}</span>
            <span class="text-mtg-text-dim font-body text-sm">{{ r.recruited }}x recruited</span>
          </div>
          <div class="bg-mtg-dark rounded-full h-3 overflow-hidden border border-mtg-border mb-2">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{ width: (r.lordWinRate * 100) + '%', backgroundColor: r.lordWinRate >= 0.5 ? '#c9a54e' : '#8a7e66' }"
            ></div>
          </div>
          <div class="flex items-center justify-between text-sm font-body">
            <span class="text-mtg-text-dim">Lord win rate:</span>
            <span :class="r.lordWinRate >= 0.5 ? 'text-mtg-gold font-beleren' : 'text-mtg-text-dim'">
              {{ pct(r.lordWinRate) }}
            </span>
          </div>
          <div class="text-xs text-mtg-text-dim/60 font-body mt-1">
            {{ r.lordWins }}W / {{ r.lordLosses }}L
          </div>
        </div>
      </div>
    </div>
  </ChartCard>
</template>
