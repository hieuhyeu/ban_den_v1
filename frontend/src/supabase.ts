import { createClient } from '@supabase/supabase-js'

let cachedToken: string | null = null
let cachedClient: ReturnType<typeof createClient> | null = null

export function createSupabaseClient(token?: string | null) {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!url || !anonKey) throw new Error('supabase_env_missing')
  const t = token ?? null
  if (cachedClient && cachedToken === t) return cachedClient
  cachedToken = t
  const headers: Record<string, string> = { apikey: anonKey }
  if (t) headers.Authorization = `Bearer ${t}`
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'ban-den-auth',
    },
    global: { headers },
  })
  return cachedClient
}

export async function uploadAvatar(params: {
  token: string
  userId: string
  playerId: string
  file: File
}) {
  const supabase = createSupabaseClient(params.token)
  const ext = params.file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${params.userId}/${params.playerId}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, params.file, {
    upsert: true,
    contentType: params.file.type || undefined,
    cacheControl: '3600',
  })
  if (error) {
    const anyErr = error as unknown as { message?: string; statusCode?: number; error?: string }
    const code = anyErr.statusCode ? ` ${anyErr.statusCode}` : ''
    throw new Error(`storage_upload_failed:${code} ${anyErr.error ?? anyErr.message ?? 'unknown'}`)
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}
