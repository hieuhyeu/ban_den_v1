import { defineStore } from 'pinia'
import { createSupabaseClient } from '../supabase'
import type { Session } from '@supabase/supabase-js'

type AuthState = {
  token: string | null
  username: string | null
  userId: string | null
  ready: boolean
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

function usernameFromSession(session: Session | null) {
  const metaUsername = session?.user?.user_metadata?.username
  if (typeof metaUsername === 'string' && metaUsername.trim()) return normalizeUsername(metaUsername)
  const email = session?.user?.email ?? ''
  const fallback = email.includes('@') ? email.split('@')[0] : ''
  return fallback ? normalizeUsername(fallback) : null
}

let authListenerBound = false

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem(LS_TOKEN),
    username: localStorage.getItem(LS_USERNAME),
    userId: localStorage.getItem(LS_USER_ID),
    ready: false,
  }),
  getters: {
    isAuthed: (state) => Boolean(state.token && state.userId),
  },
  actions: {
    applySession(session: Session | null) {
      if (!session?.access_token || !session.user?.id) {
        this.clearSession()
        this.ready = true
        return
      }
      const username = usernameFromSession(session) ?? this.username ?? ''
      this.token = session.access_token
      this.userId = session.user.id
      this.username = username || null
      localStorage.setItem(LS_TOKEN, session.access_token)
      localStorage.setItem(LS_USER_ID, session.user.id)
      if (username) localStorage.setItem(LS_USERNAME, username)
      else localStorage.removeItem(LS_USERNAME)
      this.ready = true
    },
    clearSession() {
      this.token = null
      this.username = null
      this.userId = null
      localStorage.removeItem(LS_TOKEN)
      localStorage.removeItem(LS_USERNAME)
      localStorage.removeItem(LS_USER_ID)
    },
    async initialize() {
      const supabase = createSupabaseClient()
      const { data } = await supabase.auth.getSession()
      this.applySession(data.session)
      if (!authListenerBound) {
        supabase.auth.onAuthStateChange((_event, session) => {
          this.applySession(session)
        })
        authListenerBound = true
      }
      this.ready = true
    },
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
      if (!data.session?.access_token || !data.user?.id) throw new Error('login_failed')
      this.applySession(data.session)
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

      if (data.session?.access_token && data.user?.id) {
        this.applySession(data.session)
        return
      }

      const signInRes = await supabase.auth.signInWithPassword({ email, password })
      if (signInRes.error) throw new Error('confirm_email_required')
      if (!signInRes.data.session?.access_token || !signInRes.data.user?.id) throw new Error('register_failed')
      this.applySession(signInRes.data.session)
    },
    async logout() {
      const supabase = createSupabaseClient()
      await supabase.auth.signOut()
      this.clearSession()
    },
  },
})
