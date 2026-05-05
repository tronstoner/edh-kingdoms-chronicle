<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import ChartCard from './ChartCard.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({ players: Array })

const sorted = computed(() =>
  [...props.players].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
)

const PLAYER_COLORS = {
  Ralf: '#a47be0',
  Markus: '#5ba3d9',
  Hannes: '#6ab86a',
  Ivan: '#e2b84a',
  David: '#d95555',
  Leo: '#d98ec8',
  Mariusz: '#52bfbf',
}

const chartData = computed(() => ({
  labels: sorted.value.map(p => p.name),
  datasets: [
    {
      label: 'Victories',
      data: sorted.value.map(p => p.wins),
      backgroundColor: sorted.value.map(p => PLAYER_COLORS[p.name] || '#c9a54e'),
      borderRadius: 4,
    },
    {
      label: 'Defeats',
      data: sorted.value.map(p => p.losses),
      backgroundColor: sorted.value.map(p => (PLAYER_COLORS[p.name] || '#c9a54e') + '33'),
      borderRadius: 4,
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
      ticks: { color: '#d4c8a8', font: { family: 'Cinzel', size: 13 } },
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
    <template #title>Champions' Record</template>
    <div class="h-80">
      <Bar :data="chartData" :options="{ ...chartOptions, maintainAspectRatio: false }" />
    </div>
    <div class="mt-6 overflow-x-auto">
      <table class="w-full text-base font-body">
        <thead>
          <tr class="text-mtg-gold-light border-b-2 border-mtg-border">
            <th class="text-left py-3 pr-4 font-beleren text-sm tracking-wider uppercase">Champion</th>
            <th class="text-right py-3 px-3 font-beleren text-sm tracking-wider uppercase">Games</th>
            <th class="text-right py-3 px-3 font-beleren text-sm tracking-wider uppercase">Wins</th>
            <th class="text-right py-3 px-3 font-beleren text-sm tracking-wider uppercase">Losses</th>
            <th class="text-right py-3 pl-3 font-beleren text-sm tracking-wider uppercase">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in sorted" :key="p.name" class="border-b border-mtg-border/40 hover:bg-mtg-gold/5 transition-colors">
            <td class="py-3 pr-4 text-lg">
              <router-link :to="'/player/' + p.name" class="font-beleren no-underline hover:underline" :style="{ color: PLAYER_COLORS[p.name] }">
                {{ p.name }}
              </router-link>
              <span v-if="i === 0" class="ml-1 text-mtg-gold text-sm">&#x1F451;</span>
            </td>
            <td class="text-right py-3 px-3 text-lg text-mtg-text">{{ p.games }}</td>
            <td class="text-right py-3 px-3 text-lg font-semibold text-mtg-gold">{{ p.wins }}</td>
            <td class="text-right py-3 px-3 text-lg text-mtg-text-dim">{{ p.losses }}</td>
            <td class="text-right py-3 pl-3">
              <span
                class="font-beleren text-lg px-2 py-0.5 rounded"
                :class="(p.winRate ?? 0) >= 0.5 ? 'text-mtg-gold bg-mtg-gold/10' : 'text-mtg-text'"
              >{{ pct(p.winRate) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="mt-5 border-t border-mtg-border/50 pt-4">
      <div class="flex flex-wrap gap-4 text-sm font-body">
        <span class="font-beleren text-mtg-gold-light text-xs tracking-wider uppercase mr-2">Players:</span>
        <span v-for="p in sorted" :key="p.name" class="inline-flex items-center gap-1.5 text-mtg-text-dim">
          <span class="w-3 h-3 rounded-sm" :style="{ backgroundColor: PLAYER_COLORS[p.name] }"></span>
          {{ p.name }}
        </span>
      </div>
      <p class="text-sm text-mtg-text-dim/70 font-body italic mt-2">
        Allied wins (King/Knight, Goblin team) count for both members.
      </p>
    </div>
  </ChartCard>
</template>
