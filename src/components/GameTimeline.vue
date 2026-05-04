<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js'
import ChartCard from './ChartCard.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const props = defineProps({ games: Array })

const PLAYER_COLORS = {
  Ralf: '#a47be0',
  Markus: '#5ba3d9',
  Hannes: '#6ab86a',
  Ivan: '#e2b84a',
  David: '#d95555',
  Leo: '#d98ec8',
  Mariusz: '#52bfbf',
}

const cumulativeData = computed(() => {
  const playerWins = {}
  const dates = []

  for (const game of props.games) {
    const date = game.date
    if (!dates.length || dates[dates.length - 1] !== date) {
      dates.push(date)
    }
    for (const p of game.players) {
      if (!playerWins[p.player]) playerWins[p.player] = []
      const prev = playerWins[p.player].length
        ? playerWins[p.player][playerWins[p.player].length - 1]
        : { wins: 0, date: '' }

      if (prev.date === date) {
        prev.wins += p.result === 'Win' ? 1 : 0
      } else {
        playerWins[p.player].push({
          date,
          wins: prev.wins + (p.result === 'Win' ? 1 : 0),
        })
      }
    }
  }

  const uniqueDates = [...new Set(dates)]

  const datasets = Object.entries(playerWins).map(([name, entries]) => {
    const byDate = {}
    entries.forEach(e => { byDate[e.date] = e.wins })
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
})

const chartOptions = {
  responsive: true,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#d4c8a8', font: { family: 'Cinzel', size: 13 }, padding: 16 } },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 14 },
      bodyFont: { family: 'EB Garamond', size: 14 },
    },
  },
  scales: {
    x: {
      ticks: { color: '#8a7e66', maxRotation: 45, font: { family: 'EB Garamond', size: 12 } },
      grid: { color: '#3d352922' },
    },
    y: {
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 13 } },
      grid: { color: '#3d352944' },
      title: { display: true, text: 'Cumulative Victories', color: '#c9a54e', font: { family: 'Cinzel', size: 13 } },
    },
  },
}
</script>

<template>
  <ChartCard>
    <template #title>Rise of the Champions</template>
    <div class="h-96">
      <Line :data="cumulativeData" :options="{ ...chartOptions, maintainAspectRatio: false }" />
    </div>

    <!-- Legend -->
    <div class="mt-4 border-t border-mtg-border/50 pt-4">
      <p class="text-sm text-mtg-text-dim/70 font-body italic">
        Each line tracks a player's total victories over time. Steeper climbs indicate hot streaks.
        Flat sections mean the player wasn't present or didn't win. Goblin team victories count for both members.
      </p>
    </div>
  </ChartCard>
</template>
