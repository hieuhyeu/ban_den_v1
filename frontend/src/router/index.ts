import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../views/LoginPage.vue'
import PlayerEditPage from '../views/PlayerEditPage.vue'
import RandomPage from '../views/RandomPage.vue'
import ScoreboardPage from '../views/ScoreboardPage.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'scoreboard', component: ScoreboardPage, meta: { requiresAuth: true } },
    { path: '/random', name: 'random', component: RandomPage, meta: { requiresAuth: true } },
    { path: '/players/:id/edit', name: 'playerEdit', component: PlayerEditPage, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginPage },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthed) return { name: 'login', query: { next: to.fullPath } }
  if (to.name === 'login' && auth.isAuthed) return { name: 'scoreboard' }
})

export default router
