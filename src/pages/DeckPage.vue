<script setup>
import { inject, computed } from 'vue'
import ChartCard from '../components/ChartCard.vue'
import WinRateCurve from '../components/WinRateCurve.vue'
import { colorIcons } from '../mana.js'
import { computeWinLossCurve } from '../analysis.js'

const props = defineProps({ name: String })
const data = inject('data')

const deck = computed(() => data.value?.decks.find(d => d.name === props.name))

const deckGames = computed(() =>
  (data.value?.games || []).filter(g => g.players.some(p => p.deck === props.name))
)

const recentGames = computed(() => [...deckGames.value].reverse().slice(0, 15))

const curve = computed(() =>
  computeWinLossCurve(data.value?.games || [], { deckName: props.name })
)

const roleRows = computed(() => {
  if (!deck.value) return []
  const d = deck.value
  return [
    { role: 'King', games: d.kingGames, winRate: d.kingWinRate },
    { role: 'Knight', games: d.knightGames, winRate: d.knightWinRate },
    { role: 'Goblin', games: d.goblinGames, winRate: d.goblinWinRate },
    { role: 'Lord', games: d.lordGames, winRate: d.lordWinRate },
  ].filter(r => r.games > 0)
})

const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
}

const ROLE_STYLE = {
  King: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  Knight: 'bg-green-900/30 text-green-300 border-green-700/40',
  Goblin: 'bg-red-900/30 text-red-300 border-red-700/40',
  Lord: 'bg-purple-900/30 text-purple-300 border-purple-700/40',
}

const ROLE_ORDER = { King: 0, Knight: 1, Goblin: 2, Lord: 3, 'Clone Lord': 4 }

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + '%' : '-'
}

function sortByRole(players) {
  return [...players].sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))
}
</script>

<template>
  <div v-if="!deck" class="flex items-center justify-center h-64">
    <div class="text-mtg-text-dim font-beleren text-xl">Deck "{{ name }}" not found</div>
  </div>

  <div v-else>
    <router-link to="/dashboard" class="inline-flex items-center gap-2 text-mtg-text-dim hover:text-mtg-gold transition-colors mb-6 font-body no-underline">
      &larr; Back to Dashboard
    </router-link>

    <!-- Deck header -->
    <div class="bg-mtg-card border-2 border-mtg-border rounded-xl p-6 mb-8">
      <div class="flex flex-wrap items-start gap-6 justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-3 mb-2">
            <h2 class="text-4xl font-beleren text-mtg-gold tracking-wide">{{ deck.name }}</h2>
            <span class="inline-flex gap-1">
              <i
                v-for="c in colorIcons(deck.colors || '')"
                :key="c.label"
                :class="[c.icon, 'ms-cost', 'ms-shadow']"
                class="text-xl"
                :title="c.label"
              ></i>
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-mtg-text-dim font-body mb-5">
            Pilot:
            <router-link :to="'/player/' + deck.owner" class="text-mtg-gold-light font-beleren no-underline hover:underline ml-1">{{ deck.owner }}</router-link>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ deck.games }}</div>
              <div class="text-sm text-mtg-text-dim">Games</div>
            </div>
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ deck.wins }}</div>
              <div class="text-sm text-mtg-text-dim">Wins</div>
            </div>
            <div>
              <div class="text-2xl font-beleren" :class="(deck.winRate ?? 0) >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text'">{{ pct(deck.winRate) }}</div>
              <div class="text-sm text-mtg-text-dim">Win Rate</div>
            </div>
          </div>
        </div>

        <!-- Moxfield link -->
        <div v-if="deck.url" class="flex-shrink-0 self-center">
          <a
            :href="deck.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 bg-mtg-gold text-mtg-dark font-beleren px-5 py-3 rounded-lg text-base no-underline hover:opacity-90 transition-opacity"
          >
            View Decklist
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Win Rate Over Time -->
    <ChartCard class="mb-8">
      <template #title>Win Rate Over Time</template>
      <WinRateCurve :curve-data="curve" />
    </ChartCard>

    <!-- Performance by Role -->
    <ChartCard class="mb-8">
      <template #title>Performance by Role</template>
      <div class="overflow-x-auto">
        <table class="w-full font-body text-base">
          <thead>
            <tr class="text-mtg-gold-light border-b-2 border-mtg-border">
              <th class="text-left py-2 pr-3 font-beleren text-xs tracking-wider uppercase">Role</th>
              <th class="text-right py-2 px-2 font-beleren text-xs tracking-wider uppercase">Games</th>
              <th class="text-right py-2 pl-2 font-beleren text-xs tracking-wider uppercase">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in roleRows" :key="r.role" class="border-b border-mtg-border/40">
              <td class="py-2.5 pr-3">
                <span class="inline-flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-sm" :style="{ backgroundColor: ROLE_COLORS[r.role] }"></span>
                  <span class="font-beleren" :style="{ color: ROLE_COLORS[r.role] }">{{ r.role }}</span>
                </span>
              </td>
              <td class="text-right py-2.5 px-2 text-mtg-text-dim">{{ r.games }}</td>
              <td class="text-right py-2.5 pl-2">
                <span class="font-beleren px-2 py-0.5 rounded" :class="(r.winRate ?? 0) >= 0.5 ? 'text-mtg-gold bg-mtg-gold/10' : 'text-mtg-text'">
                  {{ pct(r.winRate) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ChartCard>

    <!-- Recent Games -->
    <ChartCard>
      <template #title>Recent Battles</template>
      <div class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        <div
          v-for="(game, i) in recentGames"
          :key="i"
          class="bg-mtg-dark/70 rounded-lg p-4 border border-mtg-border"
        >
          <div class="flex items-center gap-3 mb-2">
            <span class="text-sm text-mtg-text-dim font-body italic">{{ game.date }}</span>
            <span
              v-if="game.players.find(p => p.deck === name)?.role"
              class="text-xs px-2 py-0.5 rounded border font-body"
              :class="ROLE_STYLE[game.players.find(p => p.deck === name)?.role] || ''"
            >{{ game.players.find(p => p.deck === name)?.role }}</span>
            <span
              class="font-beleren text-sm"
              :class="game.players.find(p => p.deck === name)?.result === 'Win' ? 'text-mtg-gold' : 'text-mtg-text-dim'"
            >{{ game.players.find(p => p.deck === name)?.result }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="p in sortByRole(game.players.filter(p => p.deck !== name))"
              :key="p.player"
              class="text-xs font-body px-2 py-0.5 rounded border"
              :class="p.result === 'Win' ? 'bg-mtg-gold/10 border-mtg-gold/30 text-mtg-gold' : 'bg-mtg-dark/50 border-mtg-border/50 text-mtg-text-dim'"
            >
              <router-link :to="'/player/' + p.player" class="no-underline" :class="p.result === 'Win' ? 'text-mtg-gold' : 'text-mtg-text-dim'">{{ p.player }}</router-link>
              <span class="opacity-50 ml-1">{{ p.role }}</span>
            </span>
          </div>
        </div>
      </div>
    </ChartCard>
  </div>
</template>
