<script setup>
import { inject } from 'vue'
import PlayerStats from '../components/PlayerStats.vue'
import RoleBalance from '../components/RoleBalance.vue'
import DeckStats from '../components/DeckStats.vue'
import GameTimeline from '../components/GameTimeline.vue'
import PlayerRoleHeatmap from '../components/PlayerRoleHeatmap.vue'
import RecentGames from '../components/RecentGames.vue'
import ColorStats from '../components/ColorStats.vue'

const data = inject('data')
</script>

<template>
  <div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-mtg-card border-2 border-mtg-border rounded-lg p-4 text-center">
        <div class="text-3xl font-beleren text-mtg-gold">{{ data.games.length }}</div>
        <div class="text-sm text-mtg-text-dim mt-1 font-body">Battles Waged</div>
      </div>
      <div class="bg-mtg-card border-2 border-mtg-border rounded-lg p-4 text-center">
        <div class="text-3xl font-beleren text-mtg-gold">{{ data.players.length }}</div>
        <div class="text-sm text-mtg-text-dim mt-1 font-body">Champions</div>
      </div>
      <div class="bg-mtg-card border-2 border-mtg-border rounded-lg p-4 text-center">
        <div class="text-3xl font-beleren text-mtg-gold">{{ data.decks.length }}</div>
        <div class="text-sm text-mtg-text-dim mt-1 font-body">Grimoires</div>
      </div>
      <div class="bg-mtg-card border-2 border-mtg-border rounded-lg p-4 text-center">
        <div class="text-3xl font-beleren text-mtg-gold">{{ data.roles.length }}</div>
        <div class="text-sm text-mtg-text-dim mt-1 font-body">Allegiances</div>
      </div>
    </div>

    <div class="space-y-8">
      <PlayerStats :players="data.players" />
      <PlayerRoleHeatmap :players="data.players" :games="data.games" />
      <RoleBalance :roles="data.roles" :games="data.games" />
      <ColorStats :decks="data.decks" />
      <DeckStats :decks="data.decks" />
      <GameTimeline :games="data.games" />
      <RecentGames :games="data.games" />
    </div>
  </div>
</template>
