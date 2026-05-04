<script setup>
import ChartCard from './ChartCard.vue'

const props = defineProps({ players: Array })

const roles = ['King', 'Knight', 'Goblin', 'Lord']

const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#5ba3d9',
  Goblin: '#d95555',
  Lord: '#a47be0',
}

function getRoleData(player, role) {
  const key = role.toLowerCase()
  return {
    games: player[key + 'Games'],
    winRate: player[key + 'WinRate'],
  }
}

function cellStyle(wr) {
  if (wr == null) return { backgroundColor: '#1a161288', color: '#4a3f2f' }
  const alpha = wr * 0.5 + 0.08
  return {
    backgroundColor: `rgba(201, 165, 78, ${alpha})`,
    color: wr >= 0.3 ? '#e2c878' : '#8a7e66',
  }
}

function pct(v) {
  return v != null ? (v * 100).toFixed(0) + '%' : null
}
</script>

<template>
  <ChartCard>
    <template #title>Allegiance Mastery</template>
    <div class="overflow-x-auto">
      <table class="w-full font-body text-base">
        <thead>
          <tr class="border-b-2 border-mtg-border">
            <th class="text-left py-3 pr-6 font-beleren text-mtg-gold-light text-sm tracking-wider uppercase">Champion</th>
            <th
              v-for="r in roles" :key="r"
              class="text-center py-3 px-4 font-beleren text-sm tracking-wider uppercase"
              :style="{ color: ROLE_COLORS[r] }"
            >{{ r }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in players" :key="p.name" class="border-b border-mtg-border/40">
            <td class="py-3 pr-6 font-beleren text-mtg-text text-lg">{{ p.name }}</td>
            <td v-for="r in roles" :key="r" class="text-center py-3 px-2">
              <div
                v-if="getRoleData(p, r).games"
                class="rounded-lg px-3 py-2 text-center border border-mtg-border/30 font-beleren"
                :style="cellStyle(getRoleData(p, r).winRate)"
              >
                <div class="text-lg">{{ pct(getRoleData(p, r).winRate) }}</div>
                <div class="text-xs opacity-50 font-body">{{ getRoleData(p, r).games }} games</div>
              </div>
              <div v-else class="text-mtg-text-dim/30 text-lg">&mdash;</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="mt-5 border-t border-mtg-border/50 pt-4">
      <div class="flex flex-wrap items-center gap-4 text-sm font-body text-mtg-text-dim">
        <span class="font-beleren text-mtg-gold-light text-xs tracking-wider uppercase">Win rate scale:</span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-8 h-4 rounded" style="background: rgba(201,165,78,0.08)"></span> 0%
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-8 h-4 rounded" style="background: rgba(201,165,78,0.23)"></span> 30%
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-8 h-4 rounded" style="background: rgba(201,165,78,0.33)"></span> 50%
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-8 h-4 rounded" style="background: rgba(201,165,78,0.58)"></span> 100%
        </span>
        <span class="ml-auto italic">Goblin wins count for both team members</span>
      </div>
    </div>
  </ChartCard>
</template>
