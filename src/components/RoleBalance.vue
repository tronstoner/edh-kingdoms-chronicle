<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js'
import ChartCard from './ChartCard.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({ roles: Array })

const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
}

const ROLE_DESC = {
  King: 'Revealed at the start. Must survive to win. Protected by the Knight.',
  Knight: 'Secret ally of the King. Wins when the King\'s enemies are defeated.',
  Goblin: 'Always a team of 2. Both win or both lose. Goal: kill the King.',
  Lord: 'Plays alone. Turns killed players into Zombies/Clones. Wins by killing the King last (or everyone at once).',
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
          <div class="text-sm text-mtg-text-dim/70 font-body italic">
            {{ ROLE_DESC[r.name] }}
          </div>
        </div>
      </div>
    </div>

    <!-- Legend / rules explanation -->
    <div class="mt-6 border-t border-mtg-border/50 pt-5">
      <h3 class="font-beleren text-base text-mtg-gold-light mb-3">How Kingdoms Works</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-mtg-text-dim font-body leading-relaxed">
        <p><span class="text-mtg-text">5 players:</span> 1 King, 1 Knight, 2 Goblins, 1 Lord (Zombie Lord)</p>
        <p><span class="text-mtg-text">6 players:</span> adds a Clone Lord &mdash; works like the Zombie Lord</p>
        <p><span class="text-mtg-text">Goblin team:</span> Goblins always win or lose together as a pair</p>
        <p><span class="text-mtg-text">Zombies &amp; Clones:</span> players killed by a Lord return with 20 life on the Lord's side</p>
      </div>
    </div>
  </ChartCard>
</template>
