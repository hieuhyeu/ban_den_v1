import { createClient } from '@supabase/supabase-js'
import type { Env } from './env'

export function createAnonSupabase(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
}

export function createUserSupabase(env: Env, accessToken: string) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

