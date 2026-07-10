import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ScoreboardPage from '../views/ScoreboardPage.vue'
import RandomPage from '../views/RandomPage.vue'
import PlayerEditPage from '../views/PlayerEditPage.vue'
import LoginPage from '../views/LoginPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'scoreboard',
      component: ScoreboardPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/random',
      name: 'random',
      component: RandomPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/players/:id/edit',
      name: 'playerEdit',
      component: PlayerEditPage,
      meta: { requiresAuth: true, transition: 'slide-left' },
    },
    { path: '/login', name: 'login', component: LoginPage },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthed) return { name: 'login', query: { next: to.fullPath } }
  if (to.name === 'login' && auth.isAuthed) return { name: 'scoreboard' }
})

export default router
