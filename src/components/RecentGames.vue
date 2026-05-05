<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { colorIcons } from '../mana.js'
import ChartCard from './ChartCard.vue'

const props = defineProps({ games: Array })

const allGames = computed(() => [...props.games].reverse())
const visibleCount = ref(20)
const container = ref(null)

const visible = computed(() => allGames.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < allGames.value.length)

function onScroll() {
  const el = container.value
  if (!el || !hasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
    visibleCount.value = Math.min(visibleCount.value + 20, allGames.value.length)
  }
}

onMounted(() => container.value?.addEventListener('scroll', onScroll))
onUnmounted(() => container.value?.removeEventListener('scroll', onScroll))

const ROLE_ORDER = { King: 0, Knight: 1, Goblin: 2, Lord: 3, 'Clone Lord': 4 }

function sortByRole(players) {
  return [...players].sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))
}

const ROLE_STYLE = {
  King: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  Knight: 'bg-green-900/30 text-green-300 border-green-700/40',
  Goblin: 'bg-red-900/30 text-red-300 border-red-700/40',
  Lord: 'bg-purple-900/30 text-purple-300 border-purple-700/40',
}

const PLAYER_COLORS = {
  Ralf: '#a47be0',
  Markus: '#5ba3d9',
  Hannes: '#6ab86a',
  Ivan: '#e2b84a',
  David: '#d95555',
  Leo: '#d98ec8',
  Mariusz: '#52bfbf',
}
</script>

<template>
  <ChartCard>
    <template #title>Recent Battles</template>
    <!-- Legend -->
    <div class="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-body text-mtg-text-dim">
      <span class="inline-flex items-center gap-1"><span class="bg-mtg-gold/10 border border-mtg-gold/30 rounded px-1.5 text-xs text-mtg-gold font-beleren">W</span> Victory</span>
      <span class="inline-flex items-center gap-1"><span class="bg-amber-900/30 text-amber-300 border border-amber-700/40 rounded px-1.5 text-xs">King</span></span>
      <span class="inline-flex items-center gap-1"><span class="bg-blue-900/30 text-blue-300 border border-blue-700/40 rounded px-1.5 text-xs">Knight</span></span>
      <span class="inline-flex items-center gap-1"><span class="bg-red-900/30 text-red-300 border border-red-700/40 rounded px-1.5 text-xs">Goblin</span> (team of 2)</span>
      <span class="inline-flex items-center gap-1"><span class="bg-purple-900/30 text-purple-300 border border-purple-700/40 rounded px-1.5 text-xs">Lord</span></span>
      <span class="inline-flex items-center gap-1">&#x1F9DF; Zombified</span>
      <span class="inline-flex items-center gap-1">&#x1F9EC; Cloned</span>
      <span class="inline-flex items-center gap-1">&#x1F480; Suicide</span>
    </div>

    <div ref="container" class="space-y-4 max-h-[700px] overflow-y-auto pr-2">
      <div
        v-for="(game, i) in visible"
        :key="i"
        class="bg-mtg-dark/70 rounded-lg p-5 border border-mtg-border"
      >
        <div class="text-sm text-mtg-text-dim mb-3 font-body italic">{{ game.date }}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <div
            v-for="p in sortByRole(game.players)"
            :key="p.player"
            class="flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-body border transition-colors"
            :class="p.result === 'Win' ? 'bg-mtg-gold/10 border-mtg-gold/30' : 'bg-mtg-dark/50 border-mtg-border/50'"
          >
            <div class="flex-1 min-w-0">
              <router-link
                :to="'/player/' + p.player"
                class="font-beleren text-base truncate block no-underline hover:underline transition-colors"
                :style="{ color: p.result === 'Win' ? PLAYER_COLORS[p.player] || '#c9a54e' : '#8a7e66' }"
              >{{ p.player }}</router-link>
              <div v-if="p.deck" class="text-sm text-mtg-text-dim/50 truncate" style="font-style: italic">{{ p.deck }}</div>
            </div>
            <span
              class="text-xs px-1.5 py-0.5 rounded border font-body"
              :class="ROLE_STYLE[p.role] || 'bg-mtg-dark text-mtg-text-dim border-mtg-border'"
            >{{ p.role }}</span>
            <span v-if="[p.roleNotes, p.firstKO].includes('Zombie')" class="text-mtg-text-dim text-xs" title="Turned into Zombie by Lord">&#x1F9DF;</span>
            <span v-else-if="[p.roleNotes, p.firstKO].includes('Clone')" class="text-mtg-text-dim text-xs" title="Turned into Clone by Clone Lord">&#x1F9EC;</span>
            <span v-if="[p.roleNotes, p.firstKO].includes('Suicide')" class="text-mtg-text-dim/60 text-xs" title="Self-elimination">&#x1F480;</span>
            <span v-if="p.result === 'Win'" class="text-mtg-gold font-beleren text-sm">W</span>
            <span v-else-if="p.result === 'Loss'" class="text-mtg-text-dim/30 text-sm">L</span>
          </div>
        </div>
      </div>
      <div v-if="hasMore" class="text-center py-4 text-mtg-text-dim/50 font-body text-sm italic">
        Scroll for more...
      </div>
    </div>
  </ChartCard>
</template>
