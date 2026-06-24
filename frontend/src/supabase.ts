import { createClient } from '@supabase/supabase-js'

let cachedClient: ReturnType<typeof createClient<any>> | null = null

export function createSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!url || !anonKey) throw new Error('supabase_env_missing')
  if (cachedClient) return cachedClient
  cachedClient = createClient<any>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'ban-den-auth',
    },
  })
  return cachedClient
}

export async function uploadAvatar(params: {
  userId: string
  playerId: string
  file: File
}) {
  const supabase = createSupabaseClient()
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
  const url = data.publicUrl
  const sep = url.includes('?') ? '&' : '?'
  const publicUrl = `${url}${sep}v=${Date.now()}`
  return { path, publicUrl }
}
