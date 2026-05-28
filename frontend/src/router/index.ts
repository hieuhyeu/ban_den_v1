import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'scoreboard',
      component: () => import('../views/ScoreboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/random',
      name: 'random',
      component: () => import('../views/RandomPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/players/:id/edit',
      name: 'playerEdit',
      component: () => import('../views/PlayerEditPage.vue'),
      meta: { requiresAuth: true, transition: 'slide-left' },
    },
    { path: '/login', name: 'login', component: () => import('../views/LoginPage.vue') },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthed) return { name: 'login', query: { next: to.fullPath } }
  if (to.name === 'login' && auth.isAuthed) return { name: 'scoreboard' }
})

export default router
