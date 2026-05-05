<script setup>
import { inject, computed } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend
} from 'chart.js'
import ChartCard from '../components/ChartCard.vue'
import { colorIcons } from '../mana.js'
import {
  computeRoleDistribution,
  computeDeckDiversity,
  computeNemesis,
  computeBestPartner,
  computeStreaks,
  computeZombieStats,
  computePlayerGames,
} from '../analysis.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const props = defineProps({ name: String })
const data = inject('data')

const player = computed(() =>
  data.value.players.find(p => p.name === props.name)
)

const playerGames = computed(() =>
  computePlayerGames(data.value.games, props.name)
)

const roleDist = computed(() =>
  computeRoleDistribution(data.value.games, props.name)
)

const deckDiv = computed(() =>
  computeDeckDiversity(data.value.games, props.name)
)

const nemesisData = computed(() =>
  computeNemesis(data.value.games, props.name)
)

const partnerData = computed(() =>
  computeBestPartner(data.value.games, props.name)
)

const streaks = computed(() =>
  computeStreaks(data.value.games, props.name)
)

const zombieStats = computed(() =>
  computeZombieStats(data.value.games, props.name)
)

const ROLE_COLORS = {
  King: '#e2b84a',
  Knight: '#6ab86a',
  Goblin: '#d95555',
  Lord: '#a47be0',
}

const roleChartData = computed(() => ({
  labels: roleDist.value.map(r => r.role),
  datasets: [{
    data: roleDist.value.map(r => r.count),
    backgroundColor: roleDist.value.map(r => ROLE_COLORS[r.role]),
    borderColor: '#231f1a',
    borderWidth: 3,
  }],
}))

const roleChartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#d4c8a8', font: { family: 'Cinzel', size: 13 }, padding: 16 },
    },
  },
}

const deckChartData = computed(() => {
  const top = deckDiv.value.decks
  return {
    labels: top.map(d => d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name),
    datasets: [
      {
        label: 'Wins',
        data: top.map(d => d.wins),
        backgroundColor: '#c9a54e',
        borderRadius: 4,
      },
      {
        label: 'Losses',
        data: top.map(d => d.games - d.wins),
        backgroundColor: '#c9a54e33',
        borderRadius: 4,
      },
    ],
  }
})

const deckChartOptions = {
  indexAxis: 'y',
  responsive: true,
  plugins: {
    legend: { labels: { color: '#d4c8a8', font: { family: 'EB Garamond', size: 13 } } },
    tooltip: {
      titleFont: { family: 'Cinzel', size: 14 },
      bodyFont: { family: 'EB Garamond', size: 14 },
    },
  },
  scales: {
    x: { stacked: true, ticks: { color: '#8a7e66', font: { family: 'EB Garamond' } }, grid: { color: '#3d352933' } },
    y: { stacked: true, ticks: { color: '#d4c8a8', font: { family: 'EB Garamond', size: 12 } }, grid: { display: false } },
  },
}

function pct(v) {
  return v != null ? (v * 100).toFixed(1) + '%' : '-'
}

function matchupRate(opp) {
  return opp.gamesShared > 0 ? opp.myWins / opp.gamesShared : 0
}

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

const recentGames = computed(() =>
  [...playerGames.value].reverse().slice(0, 15)
)
</script>

<template>
  <div v-if="!player" class="flex items-center justify-center h-64">
    <div class="text-mtg-text-dim font-beleren text-xl">Champion "{{ name }}" not found</div>
  </div>

  <div v-else>
    <!-- Back link -->
    <router-link to="/" class="inline-flex items-center gap-2 text-mtg-text-dim hover:text-mtg-gold transition-colors mb-6 font-body no-underline">
      &larr; Back to Dashboard
    </router-link>

    <!-- Player header -->
    <div class="bg-mtg-card border-2 border-mtg-border rounded-xl p-6 mb-8">
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-start">
        <!-- Player stats -->
        <div>
          <h2 class="text-4xl font-beleren text-mtg-gold tracking-wide mb-5">{{ player.name }}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ player.games }}</div>
              <div class="text-sm text-mtg-text-dim">Games</div>
            </div>
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ player.wins }}</div>
              <div class="text-sm text-mtg-text-dim">Wins</div>
            </div>
            <div>
              <div class="text-2xl font-beleren" :class="(player.winRate ?? 0) >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text'">{{ pct(player.winRate) }}</div>
              <div class="text-sm text-mtg-text-dim">Win Rate</div>
            </div>
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ streaks.longestWinStreak }}</div>
              <div class="text-sm text-mtg-text-dim">Best Streak</div>
            </div>
            <div>
              <div class="text-2xl font-beleren" :class="streaks.currentStreakType === 'W' ? 'text-mtg-gold' : 'text-mtg-text-dim'">
                {{ streaks.currentStreak }}{{ streaks.currentStreakType }}
              </div>
              <div class="text-sm text-mtg-text-dim">Current</div>
            </div>
            <div>
              <div class="text-2xl font-beleren text-mtg-gold">{{ streaks.last10Wins }}/{{ streaks.last10Total }}</div>
              <div class="text-sm text-mtg-text-dim">Last 10</div>
            </div>
          </div>
          <div v-if="zombieStats.timesUndead > 0 || zombieStats.playersRaised > 0" class="mt-4 pt-4 border-t border-mtg-border/50 flex flex-wrap gap-5 text-sm font-body">
            <span v-if="zombieStats.timesZombified > 0" class="flex items-center gap-1.5 text-mtg-text-dim" title="Turned into Zombie by a Lord">
              &#x1F9DF; Zombified {{ zombieStats.timesZombified }}x
            </span>
            <span v-if="zombieStats.timesCloned > 0" class="flex items-center gap-1.5 text-mtg-text-dim" title="Turned into Clone by a Clone Lord">
              &#x1F9EC; Cloned {{ zombieStats.timesCloned }}x
            </span>
            <span v-if="zombieStats.playersRaised > 0" class="flex items-center gap-1.5 text-mtg-text-dim" title="Players raised as minions while playing Lord">
              &#x2620;&#xFE0F; Raised {{ zombieStats.playersRaised }} minion{{ zombieStats.playersRaised !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- Separator -->
        <div class="hidden lg:block w-px bg-mtg-border self-stretch"></div>

        <!-- Role Distribution -->
        <div>
          <h3 class="font-beleren text-lg text-mtg-gold-light mb-4">Role Distribution</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div class="h-48 flex items-center justify-center">
              <Doughnut :data="roleChartData" :options="{ ...roleChartOptions, maintainAspectRatio: false }" />
            </div>
            <div class="space-y-3">
              <div v-for="r in roleDist" :key="r.role" class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-sm" :style="{ backgroundColor: ROLE_COLORS[r.role] }"></span>
                <span class="font-beleren text-base flex-1" :style="{ color: ROLE_COLORS[r.role] }">{{ r.role }}</span>
                <span class="text-mtg-text font-body text-base">{{ r.count }}</span>
                <span class="text-mtg-text-dim font-body text-base w-12 text-right">{{ (r.pct * 100).toFixed(0) }}%</span>
              </div>
              <p class="text-sm text-mtg-text-dim italic font-body mt-3 pt-3 border-t border-mtg-border/50">
                Expected ~20% King, ~20% Knight, ~40% Goblin, ~20% Lord.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-8 mb-8">
      <!-- Matchups -->
      <ChartCard>
        <template #title>Matchups</template>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div v-if="nemesisData.nemesis" class="bg-red-950/20 border border-red-900/30 rounded-lg p-4 text-center">
            <div class="text-xs text-red-400/70 font-body uppercase tracking-wider mb-1">Nemesis</div>
            <router-link :to="'/player/' + nemesisData.nemesis.name" class="font-beleren text-xl text-red-400 no-underline hover:underline">
              {{ nemesisData.nemesis.name }}
            </router-link>
            <div class="text-sm text-mtg-text-dim font-body mt-1">
              wins {{ pct(nemesisData.nemesis.theirWins / nemesisData.nemesis.gamesShared) }} when present
            </div>
          </div>
          <div v-if="partnerData.best" class="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4 text-center">
            <div class="text-xs text-blue-400/70 font-body uppercase tracking-wider mb-1">Trusted Ally</div>
            <router-link :to="'/player/' + partnerData.best.name" class="font-beleren text-xl text-blue-400 no-underline hover:underline">
              {{ partnerData.best.name }}
            </router-link>
            <div class="text-sm text-mtg-text-dim font-body mt-1">
              {{ partnerData.best.wins }}W/{{ partnerData.best.games }}G ({{ pct(partnerData.best.winRate) }})
            </div>
          </div>
          <div v-if="partnerData.worst && partnerData.worst.name !== partnerData.best?.name" class="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4 text-center">
            <div class="text-xs text-amber-400/70 font-body uppercase tracking-wider mb-1">Cursed Ally</div>
            <router-link :to="'/player/' + partnerData.worst.name" class="font-beleren text-xl text-amber-400 no-underline hover:underline">
              {{ partnerData.worst.name }}
            </router-link>
            <div class="text-sm text-mtg-text-dim font-body mt-1">
              {{ partnerData.worst.wins }}W/{{ partnerData.worst.games }}G ({{ pct(partnerData.worst.winRate) }})
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8">
          <!-- Opponents -->
          <div>
            <h3 class="font-beleren text-lg text-mtg-gold-light mb-3">Opponents</h3>
            <div class="space-y-2">
              <div class="flex items-center text-sm text-mtg-gold-light font-beleren tracking-wider uppercase mb-2">
                <span class="flex-1">Player</span>
                <span class="w-16 text-right">Games</span>
                <span class="w-16 text-right">My WR</span>
                <span class="w-16 text-right">Their</span>
              </div>
              <div
                v-for="opp in nemesisData.opponents.sort((a, b) => matchupRate(b) - matchupRate(a))"
                :key="opp.name"
                class="flex items-center py-2 border-b border-mtg-border/30"
              >
                <router-link :to="'/player/' + opp.name" class="flex-1 font-beleren text-base text-mtg-text no-underline hover:text-mtg-gold transition-colors">
                  {{ opp.name }}
                </router-link>
                <span class="w-16 text-right text-base text-mtg-text-dim font-body">{{ opp.gamesShared }}</span>
                <span class="w-16 text-right text-base font-body" :class="matchupRate(opp) >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text-dim'">
                  {{ pct(matchupRate(opp)) }}
                </span>
                <span class="w-16 text-right text-base font-body text-mtg-text-dim">
                  {{ pct(opp.theirWins / opp.gamesShared) }}
                </span>
              </div>
            </div>
            <p class="text-sm text-mtg-text-dim italic font-body mt-3">
              My WR = win rate when opponent is present.
            </p>
          </div>

          <!-- Separator -->
          <div class="hidden lg:block w-px bg-mtg-border"></div>

          <!-- Team partners -->
          <div v-if="partnerData.partners.length">
            <h3 class="font-beleren text-lg text-mtg-gold-light mb-3">Team Partners</h3>
            <div class="space-y-2">
              <div class="flex items-center text-sm text-mtg-gold-light font-beleren tracking-wider uppercase mb-2">
                <span class="flex-1">Ally</span>
                <span class="flex-1 text-right">Type</span>
                <span class="w-16 text-right">Games</span>
                <span class="w-16 text-right">WR</span>
              </div>
              <div
                v-for="p in partnerData.partners"
                :key="p.name"
                class="flex items-center py-2 border-b border-mtg-border/30"
              >
                <router-link :to="'/player/' + p.name" class="flex-1 font-beleren text-base text-mtg-text no-underline hover:text-mtg-gold transition-colors">
                  {{ p.name }}
                </router-link>
                <span class="flex-1 text-right text-sm text-mtg-text-dim font-body">
                  <span v-if="p.asGoblin">{{ p.asGoblin }} Goblin</span>
                  <span v-if="p.asGoblin && p.asKingKnight"> / </span>
                  <span v-if="p.asKingKnight">{{ p.asKingKnight }} K&#x2194;Kn</span>
                </span>
                <span class="w-16 text-right text-base text-mtg-text-dim font-body">{{ p.games }}</span>
                <span class="w-16 text-right text-base font-body" :class="p.winRate >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text-dim'">
                  {{ pct(p.winRate) }}
                </span>
              </div>
            </div>
            <p class="text-sm text-mtg-text-dim italic font-body mt-3">
              Goblin teammates and King/Knight pairs.
            </p>
          </div>
        </div>
      </ChartCard>
    </div>

    <!-- Deck Diversity -->
    <ChartCard class="mb-8">
      <template #title>Grimoire Arsenal ({{ deckDiv.totalDecks }} decks)</template>
      <div :style="{ height: Math.max(200, deckDiv.decks.length * 30) + 'px' }">
        <Bar :data="deckChartData" :options="{ ...deckChartOptions, maintainAspectRatio: false }" />
      </div>
      <div class="mt-5 overflow-x-auto">
        <table class="w-full font-body text-sm">
          <thead>
            <tr class="text-mtg-gold-light border-b-2 border-mtg-border">
              <th class="text-left py-2 pr-3 font-beleren text-xs tracking-wider uppercase">Deck</th>
              <th class="text-center py-2 px-2 font-beleren text-xs tracking-wider uppercase">Colors</th>
              <th class="text-right py-2 px-2 font-beleren text-xs tracking-wider uppercase">Games</th>
              <th class="text-right py-2 px-2 font-beleren text-xs tracking-wider uppercase">W/L</th>
              <th class="text-right py-2 pl-2 font-beleren text-xs tracking-wider uppercase">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in deckDiv.decks" :key="d.name" class="border-b border-mtg-border/40 hover:bg-mtg-gold/5">
              <td class="py-2 pr-3 font-beleren">
                <a v-if="(data.decks.find(dd => dd.name === d.name) || {}).url" :href="data.decks.find(dd => dd.name === d.name).url" target="_blank" rel="noopener noreferrer" class="text-mtg-text hover:text-mtg-gold transition-colors no-underline hover:underline">{{ d.name }}</a>
                <span v-else class="text-mtg-text">{{ d.name }}</span>
              </td>
              <td class="py-2 px-2 text-center">
                <span class="inline-flex gap-0.5">
                  <i
                    v-for="c in colorIcons((data.decks.find(dd => dd.name === d.name) || {}).colors || '')"
                    :key="c.label"
                    :class="[c.icon, 'ms-cost', 'ms-shadow']"
                    class="text-sm"
                  ></i>
                </span>
              </td>
              <td class="text-right py-2 px-2 text-mtg-text-dim">{{ d.games }}</td>
              <td class="text-right py-2 px-2">
                <span class="text-mtg-gold">{{ d.wins }}</span><span class="text-mtg-text-dim">/{{ d.games - d.wins }}</span>
              </td>
              <td class="text-right py-2 pl-2">
                <span class="font-beleren" :class="d.games > 0 && d.wins / d.games >= 0.5 ? 'text-mtg-gold' : 'text-mtg-text'">
                  {{ d.games > 0 ? pct(d.wins / d.games) : '-' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ChartCard>

    <!-- Recent games for this player -->
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
              class="text-xs px-2 py-0.5 rounded border font-body"
              :class="ROLE_STYLE[game.players.find(p => p.player === name)?.role] || ''"
            >{{ game.players.find(p => p.player === name)?.role }}</span>
            <span
              class="font-beleren text-sm"
              :class="game.players.find(p => p.player === name)?.result === 'Win' ? 'text-mtg-gold' : 'text-mtg-text-dim'"
            >{{ game.players.find(p => p.player === name)?.result }}</span>
            <span v-if="game.players.find(p => p.player === name)?.deck" class="text-sm text-mtg-text-dim/60 font-body ml-auto truncate max-w-xs">
              {{ game.players.find(p => p.player === name)?.deck }}
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="p in sortByRole(game.players.filter(p => p.player !== name))"
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
