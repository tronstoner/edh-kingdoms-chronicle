<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const props = defineProps({
  curveData: { type: Array, required: true },
  label: { type: String, default: 'Fortune' },
  color: { type: String, default: '#c9a54e' },
  idealRate: { type: Number, default: 100 / 3 },
})

const mode = ref('rate')

const chartData = computed(() => ({
  labels: props.curveData.map(p => p.x),
  datasets: [
    {
      label: props.label,
      data: props.curveData.map(p => mode.value === 'delta' ? p.y : p.rate),
      borderColor: props.color,
      backgroundColor: props.color + '22',
      fill: true,
      tension: 0,
      pointRadius: props.curveData.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
      borderWidth: 2,
    },
    {
      label: '_baseline',
      data: props.curveData.map(() => mode.value === 'delta' ? 0 : props.idealRate),
      borderColor: '#8a7e66',
      borderDash: [6, 4],
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 13 },
      bodyFont: { family: 'EB Garamond', size: 14 },
      filter: item => item.dataset.label !== '_baseline',
      callbacks: {
        title: (items) => props.curveData[items[0]?.dataIndex]?.date || `Game ${items[0]?.dataIndex + 1}`,
        label: (item) => {
          const v = item.raw
          return mode.value === 'delta'
            ? ` ${v > 0 ? '+' : ''}${v}`
            : ` ${v}%`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#8a7e66', font: { family: 'EB Garamond', size: 11 }, maxTicksLimit: 10 },
      grid: { color: '#3d352933' },
      title: { display: true, text: 'Game #', color: '#8a7e66', font: { family: 'EB Garamond', size: 11 } },
    },
    y: {
      ...(mode.value === 'rate' ? { min: 0, max: 100 } : {}),
      ticks: {
        color: '#8a7e66',
        font: { family: 'EB Garamond', size: 11 },
        callback: v => mode.value === 'delta' ? (v > 0 ? `+${v}` : `${v}`) : `${v}%`,
      },
      grid: { color: '#3d352933' },
    },
  },
}))
</script>

<template>
  <div v-if="!curveData || curveData.length < 2" class="flex items-center justify-center h-24 text-mtg-text-dim font-body text-sm italic">
    Not enough games to show a trend.
  </div>
  <div v-else>
    <div class="flex justify-end mb-3">
      <div class="inline-flex rounded-lg border border-mtg-border overflow-hidden text-xs font-beleren">
        <button
          @click="mode = 'delta'"
          class="px-3 py-1 transition-colors"
          :class="mode === 'delta' ? 'bg-mtg-gold text-mtg-dark' : 'bg-mtg-dark text-mtg-text-dim hover:text-mtg-text'"
        >Cumulative</button>
        <button
          @click="mode = 'rate'"
          class="px-3 py-1 transition-colors border-l border-mtg-border"
          :class="mode === 'rate' ? 'bg-mtg-gold text-mtg-dark' : 'bg-mtg-dark text-mtg-text-dim hover:text-mtg-text'"
        >Win Rate %</button>
      </div>
    </div>
    <div class="h-48">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
