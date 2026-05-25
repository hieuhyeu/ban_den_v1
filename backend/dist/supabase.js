import { createClient } from '@supabase/supabase-js';
export function createAnonSupabase(env) {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY)
        return null;
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}
export function createUserSupabase(env, accessToken) {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY)
        return null;
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
}
