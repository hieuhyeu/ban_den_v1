import { defineStore } from 'pinia'
import { http } from '../api/http'
import { getApiBaseUrl } from '../api/config'

type AuthState = {
  token: string | null
  username: string | null
  userId: string | null
}

const LS_TOKEN = 'ban_den_token'
const LS_USERNAME = 'ban_den_username'
const LS_USER_ID = 'ban_den_user_id'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem(LS_TOKEN),
    username: localStorage.getItem(LS_USERNAME),
    userId: localStorage.getItem(LS_USER_ID),
  }),
  getters: {
    isAuthed: (state) => Boolean(state.token),
  },
  actions: {
    async login(username: string, password: string) {
      const baseUrl = getApiBaseUrl()
      const res = await http<{ session: { access_token: string } | null; user: { id: string } | null }>(
        '/auth/login',
        {
          baseUrl,
          method: 'POST',
          body: { username, password },
        },
      )
      if (!res.session?.access_token || !res.user?.id) throw new Error('login_failed')
      this.setSession(username, res.user.id, res.session.access_token)
    },
    async register(username: string, password: string) {
      const baseUrl = getApiBaseUrl()
      const res = await http<{ session: { access_token: string } | null; user: { id: string } | null }>(
        '/auth/register',
        {
          baseUrl,
          method: 'POST',
          body: { username, password },
        },
      )
      if (!res.session?.access_token || !res.user?.id) throw new Error('register_failed')
      this.setSession(username, res.user.id, res.session.access_token)
    },
    setSession(username: string, userId: string, token: string) {
      this.token = token
      this.username = username
      this.userId = userId
      localStorage.setItem(LS_TOKEN, token)
      localStorage.setItem(LS_USERNAME, username)
      localStorage.setItem(LS_USER_ID, userId)
    },
    logout() {
      this.token = null
      this.username = null
      this.userId = null
      localStorage.removeItem(LS_TOKEN)
      localStorage.removeItem(LS_USERNAME)
      localStorage.removeItem(LS_USER_ID)
    },
  },
})
