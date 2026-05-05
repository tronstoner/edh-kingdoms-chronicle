import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './pages/Dashboard.vue'
import PlayerProfile from './pages/PlayerProfile.vue'
import Lifetracker from './pages/Lifetracker.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    { path: '/', component: Dashboard },
    { path: '/player/:name', component: PlayerProfile, props: true },
    { path: '/lifetracker', component: Lifetracker },
  ],
})
