<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBoardStore } from '../stores/board'

const auth = useAuthStore()
const board = useBoardStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const mode = ref<'login' | 'register'>('login')
const busy = ref(false)
const errorText = ref<string | null>(null)

const title = computed(() => (mode.value === 'login' ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN'))

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
    if (next === '/') void import('./ScoreboardPage.vue')
    void import('./RandomPage.vue')
    void board.refresh()
    router.replace(next)
  } catch (e) {
    const err = e as { message?: string }
    const code = err?.message ?? null
    if (code === 'invalid_username') {
      errorText.value = 'Username 3–24 ký tự, chỉ gồm a-z, 0-9 và . _ -'
    } else if (code === 'invalid_password') {
      errorText.value = 'Password tối thiểu 6 ký tự.'
    } else if (code === 'confirm_email_required') {
      errorText.value = 'Tài khoản cần xác thực email trước khi đăng nhập.'
    } else if (code === 'invalid_credentials') {
      errorText.value = 'Sai username hoặc password.'
    } else {
      errorText.value = err?.message ?? 'Không đăng nhập được.'
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center px-6 py-12 bg-billiard-bg bg-grain">
    <div class="mb-10 text-center">
      <div class="text-[10px] font-black tracking-widest text-zinc-500 uppercase">ỨNG DỤNG BẮN ĐỀN</div>
      <h1 class="mt-2 text-2xl font-black tracking-tighter text-zinc-100">{{ title }}</h1>
    </div>

    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-2">
        <div class="text-[10px] font-black tracking-widest text-zinc-500 uppercase">USERNAME</div>
        <input
          v-model="username"
          inputmode="text"
          autocomplete="username"
          class="h-11 rounded-xl border border-zinc-800 bg-zinc-950/20 px-4 text-sm text-zinc-100 placeholder-zinc-700 outline-none focus:border-zinc-500 transition-all"
          placeholder="Nhập tên đăng nhập"
        />
      </label>

      <label class="flex flex-col gap-2">
        <div class="text-[10px] font-black tracking-widest text-zinc-500 uppercase">PASSWORD</div>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          class="h-11 rounded-xl border border-zinc-800 bg-zinc-950/20 px-4 text-sm text-zinc-100 placeholder-zinc-700 outline-none focus:border-zinc-500 transition-all"
          placeholder="••••••••"
        />
      </label>

      <div v-if="errorText" class="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300 leading-normal">
        {{ errorText }}
      </div>

      <button
        type="submit"
        class="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 text-xs font-black tracking-widest text-zinc-950 uppercase hover:bg-white active:scale-[0.98] transition-all disabled:opacity-40"
        :disabled="busy"
      >
        {{ mode === 'login' ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN' }}
      </button>

      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/35 text-xs font-bold tracking-wider text-zinc-300 hover:bg-zinc-800 active:scale-[0.98] transition-all"
        :disabled="busy"
        @click="mode = mode === 'login' ? 'register' : 'login'"
      >
        {{ mode === 'login' ? 'TẠO TÀI KHOẢN MỚI' : 'ĐÃ CÓ TÀI KHOẢN? ĐĂNG NHẬP' }}
      </button>
    </form>
  </div>
</template>

