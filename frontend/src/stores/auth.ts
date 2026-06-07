import { defineStore } from 'pinia'
import { createSupabaseClient } from '../supabase'

type AuthState = {
  token: string | null
  username: string | null
  userId: string | null
}

const LS_TOKEN = 'ban_den_token'
const LS_USERNAME = 'ban_den_username'
const LS_USER_ID = 'ban_den_user_id'

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,24}$/

function normalizeUsername(input: string) {
  return input.trim().toLowerCase()
}

function isValidUsername(username: string) {
  return USERNAME_RE.test(username)
}

function usernameToEmail(username: string) {
  return `${username}@ban-den.local`
}

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
      const u = normalizeUsername(username)
      if (!isValidUsername(u)) throw new Error('invalid_username')
      if (!password || password.length < 6) throw new Error('invalid_password')

      const supabase = createSupabaseClient()
      const email = usernameToEmail(u)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        const msg = (error.message ?? '').toLowerCase()
        if (msg.includes('invalid login') || msg.includes('invalid credentials')) throw new Error('invalid_credentials')
        throw new Error(error.message || 'login_failed')
      }
      const token = data.session?.access_token ?? null
      const userId = data.user?.id ?? null
      if (!token || !userId) throw new Error('login_failed')
      this.setSession(u, userId, token)
    },
    async register(username: string, password: string) {
      const u = normalizeUsername(username)
      if (!isValidUsername(u)) throw new Error('invalid_username')
      if (!password || password.length < 6) throw new Error('invalid_password')

      const supabase = createSupabaseClient()
      const email = usernameToEmail(u)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: u } },
      })
      if (error) throw new Error(error.message || 'register_failed')

      const token = data.session?.access_token ?? null
      const userId = data.user?.id ?? null
      if (token && userId) {
        this.setSession(u, userId, token)
        return
      }

      const signInRes = await supabase.auth.signInWithPassword({ email, password })
      if (signInRes.error) throw new Error('confirm_email_required')
      const token2 = signInRes.data.session?.access_token ?? null
      const userId2 = signInRes.data.user?.id ?? null
      if (!token2 || !userId2) throw new Error('register_failed')
      this.setSession(u, userId2, token2)
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
