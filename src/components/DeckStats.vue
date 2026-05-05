<script setup>
import { computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import ChartCard from './ChartCard.vue'
import { colorIcons } from '../mana.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({ decks: Array })

const minGames = ref(3)
const sortBy = ref('winRate')

const OWNER_COLORS = {
  Ralf: '#a47be0',
  Markus: '#5ba3d9',
  Hannes: '#6ab86a',
  Ivan: '#e2b84a',
  David: '#d95555',
  Leo: '#d98ec8',
  Mariusz: '#52bfbf',
}

const filtered = computed(() =>
  [...props.decks]
    .filter(d => d.games >= minGames.value)
    .sort((a, b) => {
      if (sortBy.value === 'winRate') return (b.winRate ?? 0) - (a.winRate ?? 0)
      if (sortBy.value === 'games') return (b.games ?? 0) - (a.games ?? 0)
      return (b.wins ?? 0) - (a.wins ?? 0)
    })
)

const chartData = computed(() => ({
  labels: filtered.value.map(d => d.name.length > 24 ? d.name.slice(0, 22) + '...' : d.name),
  datasets: [{
    label: 'Win Rate %',
    data: filtered.value.map(d => ((d.winRate ?? 0) * 100).toFixed(1)),
    backgroundColor: filtered.value.map(d => OWNER_COLORS[d.owner] || '#6b7280'),
    borderRadius: 4,
  }],
}))

const chartOptions = {
  indexAxis: 'y',
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 14 },
      bodyFont: { family: 'EB Garamond', size: 14 },
      callbacks: {
        afterLabel: (ctx) => {
          const d = filtered.value[ctx.dataIndex]
          return `${d.owner} · ${d.games} games · ${d.wins}W/${d.losses}L`
        },
      },
    },
  },
  scales: {
    x: { max: 100, ticks: { color: '#8a7e66', callback: v => v + '%', font: { family: 'EB Garamond', size: 13 } }, grid: { color: '#3d352933' } },
    y: { ticks: { color: '#d4c8a8', font: { family: 'EB Garamond', size: 13 } }, grid: { display: false } },
  },
}

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + '%' : '-'
}
</script>

<template>
  <ChartCard>
    <template #title>Grimoire Performance</template>
    <!-- Player color legend at top -->
    <div class="mb-4 flex flex-wrap gap-4 text-sm font-body">
      <span class="font-beleren text-mtg-gold-light text-xs tracking-wider uppercase mr-1">Bar color = Pilot:</span>
      <span v-for="(color, owner) in OWNER_COLORS" :key="owner" class="flex items-center gap-1.5 text-mtg-text-dim">
        <span class="w-3 h-3 rounded-sm border border-mtg-border" :style="{ backgroundColor: color }"></span>
        {{ owner }}
      </span>
    </div>

    <div class="flex flex-wrap gap-6 mb-5">
      <label class="flex items-center gap-2 text-mtg-text-dim font-body text-base">
        Min games:
        <input
          v-model.number="minGames"
          type="range" min="1" max="15" step="1"
          class="accent-mtg-gold"
        />
        <span class="text-mtg-gold font-beleren w-6 text-center text-lg">{{ minGames }}</span>
      </label>
      <label class="flex items-center gap-2 text-mtg-text-dim font-body text-base">
        Sort by:
        <select v-model="sortBy" class="bg-mtg-dark border border-mtg-border rounded px-3 py-1.5 text-mtg-text font-body text-base">
          <option value="winRate">Win Rate</option>
          <option value="games">Games</option>
          <option value="wins">Wins</option>
        </select>
      </label>
    </div>

    <div :style="{ height: Math.max(350, filtered.length * 30) + 'px' }">
      <Bar :data="chartData" :options="{ ...chartOptions, maintainAspectRatio: false }" />
    </div>

    <!-- Deck table with mana colors -->
    <div class="mt-6 overflow-x-auto">
      <table class="w-full font-body text-base">
        <thead>
          <tr class="text-mtg-gold-light border-b-2 border-mtg-border">
            <th class="text-left py-3 pr-3 font-beleren text-sm tracking-wider uppercase">Deck</th>
            <th class="text-center py-3 px-2 font-beleren text-sm tracking-wider uppercase">Colors</th>
            <th class="text-left py-3 px-2 font-beleren text-sm tracking-wider uppercase">Pilot</th>
            <th class="text-right py-3 px-2 font-beleren text-sm tracking-wider uppercase">Games</th>
            <th class="text-right py-3 px-2 font-beleren text-sm tracking-wider uppercase">W/L</th>
            <th class="text-right py-3 pl-2 font-beleren text-sm tracking-wider uppercase">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in filtered" :key="d.name" class="border-b border-mtg-border/40 hover:bg-mtg-gold/5 transition-colors">
            <td class="py-2.5 pr-3 font-beleren">
              <a v-if="d.url" :href="d.url" target="_blank" rel="noopener noreferrer" class="text-mtg-text hover:text-mtg-gold transition-colors no-underline hover:underline">{{ d.name }}</a>
              <span v-else class="text-mtg-text">{{ d.name }}</span>
            </td>
            <td class="py-2.5 px-2 text-center">
              <span class="inline-flex gap-0.5">
                <i
                  v-for="c in colorIcons(d.colors)"
                  :key="c.label"
                  :class="[c.icon, 'ms-cost', 'ms-shadow']"
                  class="text-base"
                  :title="c.label"
                ></i>
              </span>
            </td>
            <td class="py-2.5 px-2">
              <router-link :to="'/player/' + d.owner" class="no-underline hover:underline transition-colors" :style="{ color: OWNER_COLORS[d.owner] }">{{ d.owner }}</router-link>
            </td>
            <td class="text-right py-2.5 px-2 text-mtg-text-dim">{{ d.games }}</td>
            <td class="text-right py-2.5 px-2">
              <span class="text-mtg-gold">{{ d.wins }}</span><span class="text-mtg-text-dim">/</span><span class="text-mtg-text-dim">{{ d.losses }}</span>
            </td>
            <td class="text-right py-2.5 pl-2">
              <span
                class="font-beleren px-2 py-0.5 rounded"
                :class="(d.winRate ?? 0) >= 0.5 ? 'text-mtg-gold bg-mtg-gold/10' : 'text-mtg-text'"
              >{{ pct(d.winRate) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-4 text-sm text-mtg-text-dim/70 font-body italic">
      Horizontal bars show win rate %. Bar color indicates the deck's pilot (see legend above). Table below includes mana colors and detailed stats.
    </p>
  </ChartCard>
</template>
