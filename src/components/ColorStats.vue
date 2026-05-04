<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js'
import ChartCard from './ChartCard.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({ decks: Array })

const COLOR_META = {
  W: { name: 'White', icon: 'ms ms-w ms-cost ms-shadow', color: '#f5f0d0', bar: '#d4c88a' },
  U: { name: 'Blue', icon: 'ms ms-u ms-cost ms-shadow', color: '#6aa8d4', bar: '#4a8fc2' },
  B: { name: 'Black', icon: 'ms ms-b ms-cost ms-shadow', color: '#a08c78', bar: '#6b5c4a' },
  R: { name: 'Red', icon: 'ms ms-r ms-cost ms-shadow', color: '#d96a5a', bar: '#d95555' },
  G: { name: 'Green', icon: 'ms ms-g ms-cost ms-shadow', color: '#6ab86a', bar: '#4a9a4a' },
}

const colorStats = computed(() => {
  const stats = {}
  for (const c of 'WUBRG') {
    stats[c] = { games: 0, wins: 0, losses: 0, decks: 0 }
  }

  for (const deck of props.decks) {
    if (!deck.colors || !deck.games) continue
    for (const c of deck.colors) {
      if (!stats[c]) continue
      stats[c].games += deck.games
      stats[c].wins += deck.wins ?? 0
      stats[c].losses += deck.losses ?? 0
      stats[c].decks++
    }
  }

  return Object.entries(stats).map(([c, s]) => ({
    code: c,
    ...COLOR_META[c],
    ...s,
    winRate: s.games > 0 ? s.wins / s.games : null,
  }))
})

// Color pair analysis - which 2-color combos perform best
const pairStats = computed(() => {
  const pairs = {}

  for (const deck of props.decks) {
    if (!deck.colors || deck.colors.length < 2 || !deck.games) continue
    const key = deck.colors.split('').sort().join('')
    if (!pairs[key]) {
      pairs[key] = { colors: deck.colors, games: 0, wins: 0, losses: 0, decks: [] }
    }
    pairs[key].games += deck.games
    pairs[key].wins += deck.wins ?? 0
    pairs[key].losses += deck.losses ?? 0
    pairs[key].decks.push(deck.name)
  }

  return Object.values(pairs)
    .filter(p => p.games >= 3)
    .map(p => ({ ...p, winRate: p.wins / p.games }))
    .sort((a, b) => b.winRate - a.winRate)
})

const chartData = computed(() => ({
  labels: colorStats.value.map(c => c.name),
  datasets: [
    {
      label: 'Wins',
      data: colorStats.value.map(c => c.wins),
      backgroundColor: colorStats.value.map(c => c.bar),
      borderRadius: 6,
    },
    {
      label: 'Losses',
      data: colorStats.value.map(c => c.losses),
      backgroundColor: colorStats.value.map(c => c.bar + '33'),
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
    <template #title>Color Performance</template>

    <p class="mb-4 text-sm text-mtg-text-dim font-body italic">
      Aggregate performance of decks containing each color. A deck with multiple colors counts toward each.
      Stacked bars show wins (solid) and losses (faded). Percentage is the overall win rate across all decks using that color.
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <div class="lg:col-span-3 h-72">
        <Bar :data="chartData" :options="{ ...chartOptions, maintainAspectRatio: false }" />
      </div>

      <div class="lg:col-span-2 space-y-4">
        <div v-for="c in colorStats" :key="c.code" class="flex items-center gap-3">
          <i :class="c.icon" class="text-xl"></i>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <span class="font-beleren text-base" :style="{ color: c.color }">{{ c.name }}</span>
              <span class="font-beleren text-base" :style="{ color: c.color }">{{ pct(c.winRate) }}</span>
            </div>
            <div class="bg-mtg-dark rounded-full h-3 overflow-hidden border border-mtg-border">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: ((c.winRate ?? 0) * 100) + '%', backgroundColor: c.bar }"
              ></div>
            </div>
            <div class="text-xs text-mtg-text-dim mt-0.5 font-body">
              {{ c.decks }} decks &middot; {{ c.games }} games &middot; {{ c.wins }}W/{{ c.losses }}L
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Color combination performance -->
    <div v-if="pairStats.length" class="mt-8 border-t border-mtg-border/50 pt-6">
      <h3 class="font-beleren text-lg text-mtg-gold-light mb-2">Color Combinations</h3>
      <p class="text-sm text-mtg-text-dim font-body italic mb-4">
        Win rate of decks grouped by their exact color identity. Only combinations with 3+ games shown.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="p in pairStats"
          :key="p.colors"
          class="bg-mtg-dark/70 border border-mtg-border/50 rounded-lg px-4 py-3 flex items-center gap-3"
        >
          <span class="inline-flex gap-0.5 shrink-0">
            <i
              v-for="c in p.colors.split('')"
              :key="c"
              :class="[COLOR_META[c]?.icon]"
              class="text-base"
            ></i>
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="font-beleren text-sm text-mtg-text">{{ p.colors }}</span>
              <span
                class="font-beleren text-sm"
                :class="p.winRate >= 0.4 ? 'text-mtg-gold' : 'text-mtg-text-dim'"
              >{{ pct(p.winRate) }}</span>
            </div>
            <div class="text-xs text-mtg-text-dim font-body">
              {{ p.games }} games &middot; {{ p.wins }}W/{{ p.losses }}L
            </div>
          </div>
        </div>
      </div>
    </div>
  </ChartCard>
</template>
