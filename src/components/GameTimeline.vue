<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js'
import ChartCard from './ChartCard.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const props = defineProps({ games: Array })

const mode = ref('delta')

const PLAYER_COLORS = {
  Ralf: '#a47be0',
  Markus: '#5ba3d9',
  Hannes: '#6ab86a',
  Ivan: '#e2b84a',
  David: '#d95555',
  Leo: '#d98ec8',
  Mariusz: '#52bfbf',
}

function buildTimeline(scoreFn) {
  const playerScores = {}
  const dates = []

  for (const game of props.games) {
    const date = game.date
    if (!dates.length || dates[dates.length - 1] !== date) {
      dates.push(date)
    }
    for (const p of game.players) {
      if (!playerScores[p.player]) playerScores[p.player] = []
      const arr = playerScores[p.player]
      const prev = arr.length ? arr[arr.length - 1] : { score: 0, date: '' }

      if (prev.date === date) {
        prev.score += scoreFn(p.result)
      } else {
        arr.push({ date, score: prev.score + scoreFn(p.result) })
      }
    }
  }

  const uniqueDates = [...new Set(dates)]

  const datasets = Object.entries(playerScores).map(([name, entries]) => {
    const byDate = {}
    entries.forEach(e => { byDate[e.date] = e.score })
    let last = 0
    const data = uniqueDates.map(d => {
      if (byDate[d] !== undefined) last = byDate[d]
      return last
    })
    return {
      label: name,
      data,
      borderColor: PLAYER_COLORS[name] || '#6b7280',
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: PLAYER_COLORS[name] || '#6b7280',
      borderWidth: 2.5,
    }
  })

  return { labels: uniqueDates, datasets }
}

const chartData = computed(() =>
  mode.value === 'wins'
    ? buildTimeline(result => result === 'Win' ? 1 : 0)
    : buildTimeline(result => result === 'Win' ? 1 : -1)
)

const chartOptions = computed(() => ({
  responsive: true,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#d4c8a8', font: { family: 'Cinzel', size: 13 }, padding: 16 } },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 14 },
      bodyFont: { family: 'EB Garamond', size: 14 },
      callbacks: {
        label: (item) => {
          const v = item.raw
          const prefix = mode.value === 'delta' && v > 0 ? '+' : ''
          return ` ${item.dataset.label}: ${prefix}${v}`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#8a7e66', maxRotation: 45, font: { family: 'EB Garamond', size: 12 } },
      grid: { color: '#3d352922' },
    },
    y: {
      ticks: {
        color: '#8a7e66',
        font: { family: 'EB Garamond', size: 13 },
        callback: v => mode.value === 'delta' && v > 0 ? `+${v}` : `${v}`,
      },
      grid: { color: '#3d352944' },
      title: {
        display: true,
        text: mode.value === 'wins' ? 'Cumulative Victories' : 'Cumulative W−L',
        color: '#c9a54e',
        font: { family: 'Cinzel', size: 13 },
      },
    },
  },
}))
</script>

<template>
  <ChartCard>
    <template #title>Rise of the Champions</template>

    <div class="flex justify-end mb-3">
      <div class="inline-flex rounded-lg border border-mtg-border overflow-hidden text-xs font-beleren">
        <button
          @click="mode = 'delta'"
          class="px-3 py-1 transition-colors"
          :class="mode === 'delta' ? 'bg-mtg-gold text-mtg-dark' : 'bg-mtg-dark text-mtg-text-dim hover:text-mtg-text'"
        >Cumulative W−L</button>
        <button
          @click="mode = 'wins'"
          class="px-3 py-1 transition-colors border-l border-mtg-border"
          :class="mode === 'wins' ? 'bg-mtg-gold text-mtg-dark' : 'bg-mtg-dark text-mtg-text-dim hover:text-mtg-text'"
        >Total Wins</button>
      </div>
    </div>

    <div class="h-96">
      <Line :data="chartData" :options="{ ...chartOptions, maintainAspectRatio: false }" />
    </div>

    <div class="mt-4 border-t border-mtg-border/50 pt-4">
      <p class="text-sm text-mtg-text-dim/70 font-body italic">
        Allied wins (King/Knight, Goblin team) count for both members.
      </p>
    </div>
  </ChartCard>
</template>
