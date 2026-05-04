import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './pages/Dashboard.vue'
import PlayerProfile from './pages/PlayerProfile.vue'

export default createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    { path: '/', component: Dashboard },
    { path: '/player/:name', component: PlayerProfile, props: true },
  ],
})
