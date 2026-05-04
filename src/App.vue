<script setup>
import { ref, onMounted } from 'vue'
import { initGoogleAuth, signIn, signOut, isSignedIn } from './google-auth.js'
import { fetchAllData } from './data.js'
import PlayerStats from './components/PlayerStats.vue'
import RoleBalance from './components/RoleBalance.vue'
import DeckStats from './components/DeckStats.vue'
import GameTimeline from './components/GameTimeline.vue'
import PlayerRoleHeatmap from './components/PlayerRoleHeatmap.vue'
import RecentGames from './components/RecentGames.vue'
import ColorStats from './components/ColorStats.vue'

const data = ref(null)
const error = ref(null)
const loading = ref(false)
const authReady = ref(false)
const signedIn = ref(false)

onMounted(async () => {
  try {
    const restored = await initGoogleAuth()
    authReady.value = true
    if (restored) {
      signedIn.value = true
      loading.value = true
      try {
        data.value = await fetchAllData()
      } catch (e) {
        // Token might be expired despite our check, prompt re-login
        signedIn.value = false
        error.value = null
      } finally {
        loading.value = false
      }
    }
  } catch (e) {
    error.value = e.message
  }
})

async function handleSignIn() {
  error.value = null
  const result = await signIn()
  if (result.error) {
    error.value = `Sign-in failed: ${result.error}`
    return
  }
  signedIn.value = true
  loading.value = true
  try {
    data.value = await fetchAllData()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function handleSignOut() {
  signOut()
  signedIn.value = false
  data.value = null
}
</script>

<template>
  <div class="min-h-screen bg-mtg-dark font-body text-mtg-text">
    <!-- Header -->
    <header class="border-b-2 border-mtg-gold/30 bg-mtg-dark/90 backdrop-blur sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
        <svg class="w-8 h-8 shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 34 L4 16 L14 24 L24 8 L34 24 L44 16 L40 34Z" fill="currentColor" class="text-mtg-gold"/>
          <rect x="8" y="34" width="32" height="6" rx="2" fill="currentColor" class="text-mtg-gold"/>
          <circle cx="4" cy="15" r="3" fill="#c0392b"/><circle cx="24" cy="7" r="3.5" fill="#c0392b"/><circle cx="44" cy="15" r="3" fill="#c0392b"/>
          <circle cx="16" cy="37" r="1.5" fill="#c0392b" opacity="0.8"/><circle cx="24" cy="37" r="1.5" fill="#c0392b" opacity="0.8"/><circle cx="32" cy="37" r="1.5" fill="#c0392b" opacity="0.8"/>
        </svg>
        <h1 class="text-2xl font-beleren text-mtg-gold tracking-wide">EDH Kingdoms Chronicle</h1>
        <span class="text-sm text-mtg-text-dim ml-auto hidden sm:inline font-body italic">Commander &middot; Kingdoms Variant</span>
        <button
          v-if="signedIn"
          @click="handleSignOut"
          class="ml-4 text-sm text-mtg-text-dim hover:text-mtg-gold transition-colors cursor-pointer font-body"
        >
          Sign out
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Sign-in screen -->
      <div v-if="!signedIn && !loading" class="flex items-center justify-center h-96">
        <div class="text-center space-y-6 max-w-md">
          <div class="flex justify-center gap-2 text-4xl">
            <i class="ms ms-w ms-cost ms-shadow"></i>
            <i class="ms ms-u ms-cost ms-shadow"></i>
            <i class="ms ms-b ms-cost ms-shadow"></i>
            <i class="ms ms-r ms-cost ms-shadow"></i>
            <i class="ms ms-g ms-cost ms-shadow"></i>
          </div>
          <h2 class="text-3xl font-beleren text-mtg-gold tracking-wide">EDH Kingdoms Chronicle</h2>
          <p class="text-mtg-text-dim font-body text-lg italic leading-relaxed">
            "The throne room echoes with the clash of alliances forged and broken.
            Sign in to reveal the annals of your kingdom."
          </p>
          <button
            v-if="authReady"
            @click="handleSignIn"
            class="bg-mtg-gold/20 hover:bg-mtg-gold/30 text-mtg-gold border-2 border-mtg-gold/50 hover:border-mtg-gold px-8 py-3 rounded font-beleren text-lg tracking-wide transition-all cursor-pointer"
          >
            Sign in with Google
          </button>
          <div v-if="error" class="mt-4 text-red-400 text-sm font-body">{{ error }}</div>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="flex items-center justify-center h-64">
        <div class="text-mtg-gold font-beleren text-xl animate-pulse tracking-wide">Summoning data from the archives...</div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex items-center justify-center h-64">
        <div class="bg-red-950/30 border-2 border-red-800/50 rounded-lg p-6 max-w-lg">
          <h2 class="text-red-400 font-beleren mb-2">Spell Fizzled</h2>
          <p class="text-red-300 text-sm font-body">{{ error }}</p>
        </div>
      </div>

      <!-- Data loaded -->
      <template v-else-if="data">
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
          <PlayerRoleHeatmap :players="data.players" />
          <RoleBalance :roles="data.roles" />
          <ColorStats :decks="data.decks" />
          <DeckStats :decks="data.decks" />
          <GameTimeline :games="data.games" />
          <RecentGames :games="data.games" />
        </div>
      </template>
    </main>

    <footer class="border-t-2 border-mtg-gold/20 mt-12 py-6 text-center text-sm text-mtg-text-dim font-body italic">
      EDH Kingdoms Chronicle &middot; Data from the Royal Archives
    </footer>
  </div>
</template>
