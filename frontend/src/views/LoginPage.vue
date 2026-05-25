<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { HttpError } from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const mode = ref<'login' | 'register'>('login')
const busy = ref(false)
const errorText = ref<string | null>(null)

const title = computed(() => (mode.value === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'))

async function onSubmit() {
  const u = username.value.trim()
  const p = password.value
  if (!u || !p) return
  errorText.value = null
  busy.value = true
  try {
    if (mode.value === 'login') await auth.login(u, p)
    else await auth.register(u, p)
    const next = typeof route.query.next === 'string' ? route.query.next : '/'
    router.replace(next)
  } catch (e) {
    const err = e as Partial<HttpError> & { message?: string }
    const body = err?.body as { error?: string } | null | undefined
    const code = body?.error ?? null
    if (code === 'invalid_username') {
      errorText.value = 'Username 3–24 ký tự, chỉ gồm a-z, 0-9 và . _ -'
    } else if (code === 'invalid_body') {
      errorText.value = 'Password tối thiểu 6 ký tự.'
    } else if (code === 'supabase_not_configured') {
      errorText.value = 'Backend chưa cấu hình SUPABASE_URL/SUPABASE_ANON_KEY.'
    } else if (typeof code === 'string' && code.length) {
      errorText.value = code
    } else {
      errorText.value = err?.message ?? 'Không đăng nhập được.'
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-5 py-10">
    <div class="mb-8">
      <div class="text-sm font-medium text-zinc-400">Bắn đền</div>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight">{{ title }}</h1>
    </div>

    <form class="flex flex-1 flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-2">
        <div class="text-sm font-medium text-zinc-300">Username</div>
        <input
          v-model="username"
          inputmode="text"
          autocomplete="username"
          class="h-12 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 text-base outline-none ring-0 placeholder:text-zinc-600 focus:border-zinc-600"
          placeholder="ví dụ: ban_den_team"
        />
      </label>

      <label class="flex flex-col gap-2">
        <div class="text-sm font-medium text-zinc-300">Password</div>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          class="h-12 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 text-base outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          placeholder="••••••••"
        />
      </label>

      <div v-if="errorText" class="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {{ errorText }}
      </div>

      <button
        type="submit"
        class="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-violet-500 px-4 text-base font-semibold text-zinc-950 active:bg-violet-400 disabled:opacity-40"
        :disabled="busy"
      >
        {{ mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản' }}
      </button>

      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 text-sm font-semibold text-zinc-200 active:bg-zinc-800 disabled:opacity-40"
        :disabled="busy"
        @click="mode = mode === 'login' ? 'register' : 'login'"
      >
        {{ mode === 'login' ? 'Chưa có tài khoản? Tạo mới' : 'Đã có tài khoản? Đăng nhập' }}
      </button>

      <div class="mt-auto pt-6 text-center text-xs text-zinc-500">
        Bằng việc đăng nhập, bạn đồng ý lưu dữ liệu tính điểm theo tài khoản.
      </div>
    </form>
  </div>
</template>
