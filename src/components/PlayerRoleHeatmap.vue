<script setup>
import ChartCard from './ChartCard.vue'
import { ROLE_COLORS, rolePortraitUrl } from '../roles.js'

const props = defineProps({ players: Array })

const roles = ['King', 'Knight', 'Goblin', 'Lord']

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
              class="text-center py-3 px-4 font-beleren text-sm tracking-wider uppercase align-bottom"
              :style="{ color: ROLE_COLORS[r] }"
            >
              <div class="flex flex-col items-center gap-2">
                <img :src="rolePortraitUrl(r)" :alt="r" class="role-portrait-thumb" />
                <span>{{ r }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in players" :key="p.name" class="border-b border-mtg-border/40">
            <td class="py-3 pr-6 font-beleren text-lg">
              <router-link :to="'/player/' + p.name" class="text-mtg-text no-underline hover:text-mtg-gold transition-colors">{{ p.name }}</router-link>
            </td>
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
        <span class="ml-auto italic">Allied wins count for both members</span>
      </div>
    </div>
  </ChartCard>
</template>

<style scoped>
.role-portrait-thumb {
  width: clamp(56px, 7vw, 96px);
  aspect-ratio: 1 / 1;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5));
}
</style>
