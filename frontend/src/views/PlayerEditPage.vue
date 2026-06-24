<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PLAYER_COLOR_OPTIONS } from '../stores/board'
import { useAuthStore } from '../stores/auth'
import { useBoardStore } from '../stores/board'
import { uploadAvatar } from '../supabase'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const board = useBoardStore()

const playerId = computed(() => String(route.params.id ?? ''))
const player = computed(() => board.activePlayers.find((p) => p.id === playerId.value) ?? null)
const busy = ref(false)
const avatarBusy = ref(false)
const errorText = ref<string | null>(null)

const draftName = ref('')
watch(
  player,
  (p) => {
    draftName.value = p?.name ?? ''
  },
  { immediate: true },
)

async function commitName() {
  if (!player.value) return
  const n = draftName.value.trim()
  if (!n) {
    draftName.value = player.value.name
    return
  }
  busy.value = true
  try {
    await board.renamePlayer(player.value.id, n)
  } finally {
    busy.value = false
  }
}

async function pickColor(key: (typeof PLAYER_COLOR_OPTIONS)[number]['key']) {
  if (!player.value) return
  busy.value = true
  try {
    await board.setPlayerColor(player.value.id, key)
  } finally {
    busy.value = false
  }
}

const fileInputEl = ref<HTMLInputElement | null>(null)

function openAvatarPicker() {
  fileInputEl.value?.click()
}

async function onAvatarPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!player.value) return
  if (!file) return
  if (!auth.userId) return
  const before = player.value.avatarUrl
  const objectUrl = URL.createObjectURL(file)
  board.setPlayerAvatarLocal(player.value.id, objectUrl)
  busy.value = true
  avatarBusy.value = true
  errorText.value = null
  try {
    const res = await uploadAvatar({ userId: auth.userId, playerId: player.value.id, file })
    await board.setPlayerAvatarUrl(player.value.id, res.publicUrl)
  } catch (e) {
    board.setPlayerAvatarLocal(player.value.id, before)
    const msg = e instanceof Error ? e.message : 'unknown_error'
    errorText.value = `Upload avatar lỗi: ${msg}`
  } finally {
    URL.revokeObjectURL(objectUrl)
    busy.value = false
    avatarBusy.value = false
  }
}

async function removeAvatar() {
  if (!player.value) return
  busy.value = true
  avatarBusy.value = true
  errorText.value = null
  try {
    await board.setPlayerAvatarUrl(player.value.id, null)
  } finally {
    busy.value = false
    avatarBusy.value = false
  }
}

function goBack() {
  router.back()
}

async function deleteThisPlayer() {
  if (!player.value) return
  const id = player.value.id
  busy.value = true
  try {
    await board.deletePlayer(id)
  } finally {
    busy.value = false
  }
  router.replace({ name: 'scoreboard' })
}

const selectedColor = computed(() => {
  const key = player.value?.colorKey
  return PLAYER_COLOR_OPTIONS.find((x) => x.key === key) ?? PLAYER_COLOR_OPTIONS[0]!
})

const avatarUrl = computed(() => player.value?.avatarUrl ?? '')

onMounted(async () => {
  if (!board.board) await board.refresh()
})
</script>

<template>
  <div class="mx-auto flex h-[100svh] w-full max-w-md flex-col">
    <div
      v-if="avatarBusy"
      class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-6 backdrop-blur"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="w-full max-w-xs rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 text-center">
        <div class="text-sm font-semibold text-zinc-100">Đang cập nhật ảnh…</div>
        <div class="mt-4 flex items-center justify-center">
          <div class="h-10 w-10 animate-spin rounded-full border-[3px] border-zinc-700 border-t-violet-500" />
        </div>
      </div>
    </div>

    <div class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div class="mx-auto flex h-14 w-full max-w-md items-center justify-between gap-3 px-3">
        <button
          class="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98]"
          aria-label="Back"
          @click="goBack"
        >
          ←
        </button>
        <button
          class="inline-flex h-11 items-center justify-center rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 px-4 text-xs font-black tracking-widest text-rose-200 active:bg-rose-500/20 active:scale-[0.99]"
          aria-label="Xóa người chơi"
          :disabled="busy"
          @click="deleteThisPlayer"
        >
          🗑 XÓA
        </button>
      </div>
    </div>

    <div
      class="flex-1 overflow-hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 overscroll-none"
    >
      <div v-if="!player" class="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-400">
        Không tìm thấy người chơi.
      </div>

      <div v-else class="flex h-full flex-col gap-3">
        <div
          v-if="errorText"
          class="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200"
        >
          {{ errorText }}
        </div>
        <div class="rounded-3xl border-2 border-zinc-800 bg-zinc-900/30 p-3">
          <div class="flex items-center gap-3">
            <button
              class="relative h-[clamp(56px,9svh,64px)] w-[clamp(56px,9svh,64px)] overflow-hidden rounded-[22px] border-2 border-zinc-800 bg-zinc-950/40 shadow-[0_10px_0_0_rgba(0,0,0,0.35)] active:scale-[0.98]"
              aria-label="Chọn ảnh avatar"
              :disabled="busy"
              @click="openAvatarPicker"
            >
              <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover" />
              <div v-else class="flex h-full w-full items-center justify-center text-2xl font-black text-zinc-500">+</div>
            </button>
            <div class="flex flex-1 items-center justify-end gap-2">
              <button
                class="h-10 rounded-2xl border-2 border-zinc-800 bg-zinc-950/40 px-4 text-sm font-extrabold text-zinc-200 active:bg-zinc-900/60 active:scale-[0.99] disabled:opacity-40"
                :disabled="!avatarUrl"
                @click="removeAvatar"
              >
                Gỡ
              </button>
            </div>
          </div>
          <input
            ref="fileInputEl"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onAvatarPicked"
          />
        </div>

        <div>
          <div class="mb-2 text-xs font-black tracking-widest text-zinc-500">PREVIEW</div>
          <div class="overflow-hidden rounded-[28px] border-2 border-zinc-800 shadow-[0_14px_0_0_rgba(0,0,0,0.35)]">
            <div
              class="flex items-center gap-2 border-b-2 border-zinc-900/70 px-2 py-1 saturate-150"
              :class="selectedColor.headerClass"
            >
              <div
                class="h-8 w-8 overflow-hidden rounded-2xl border-2 border-zinc-950/30 bg-zinc-950/20"
                aria-hidden="true"
              >
                <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover" />
              </div>
              <input
                v-model="draftName"
                class="h-8 w-full appearance-none border-0 bg-transparent px-0 text-base font-black tracking-tight text-zinc-950 outline-none placeholder:text-zinc-950/70 focus:outline-none focus:ring-0"
                placeholder="Tên người chơi"
                @keydown.enter.prevent="commitName"
                @blur="commitName"
              />
            </div>
            <div class="flex h-[clamp(72px,12svh,84px)] items-center justify-center px-4 py-3" :style="{ backgroundColor: selectedColor.hex }">
              <div class="text-5xl font-black tabular-nums text-zinc-950">{{ player.score }}</div>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border-2 border-zinc-800 bg-zinc-900/30 p-3">
          <div class="text-xs font-black tracking-widest text-zinc-500">MÀU CARD</div>
          <div class="mt-3 grid grid-cols-4 gap-2">
            <button
              v-for="c in PLAYER_COLOR_OPTIONS"
              :key="c.key"
              class="aspect-square touch-manipulation rounded-2xl border-2 border-zinc-800 shadow-[0_10px_0_0_rgba(0,0,0,0.25)] active:scale-[0.98] disabled:opacity-40"
              :class="player.colorKey === c.key ? 'ring-2 ring-zinc-100/80 ring-offset-2 ring-offset-zinc-950' : ''"
              :style="{ backgroundColor: c.hex }"
              :aria-label="`Chọn màu ${c.label}`"
              :disabled="busy"
              @click="pickColor(c.key)"
            >
              <span class="sr-only">{{ c.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
