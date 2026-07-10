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
  <div class="mx-auto flex h-[100svh] w-full max-w-[430px] flex-col bg-[#050807] bg-grain overflow-hidden">
    <!-- Image Update Loader -->
    <div
      v-if="avatarBusy"
      class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-6 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="w-full max-w-xs rounded-2xl border border-zinc-900 bg-zinc-950/60 p-5 text-center">
        <div class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">ĐANG CẬP NHẬT ẢNH...</div>
        <div class="mt-4 flex items-center justify-center">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-300" />
        </div>
      </div>
    </div>

    <!-- Header bar -->
    <div class="sticky top-0 z-10 border-b border-zinc-900 bg-[#050807]/80 backdrop-blur-lg pt-safe">
      <div class="mx-auto flex h-14 w-full max-w-[430px] items-center justify-between gap-3 px-4">
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-zinc-300 active:bg-zinc-800 active:text-zinc-150 active:scale-[0.96] transition-all"
          aria-label="Back"
          @click="goBack"
        >
          <!-- SVG Back Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <button
          class="inline-flex h-9 items-center justify-center rounded-xl border border-rose-950/40 bg-rose-950/15 px-3.5 text-[9px] font-black tracking-widest text-rose-350 hover:bg-rose-950/25 active:scale-[0.96] transition-all uppercase"
          aria-label="Xóa người chơi"
          :disabled="busy"
          @click="deleteThisPlayer"
        >
          Xóa Người Chơi
        </button>
      </div>
    </div>

    <!-- Edit Panels -->
    <div class="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 overscroll-contain">
      <div v-if="!player" class="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 text-center text-xs font-bold text-zinc-500 uppercase tracking-wide">
        Không tìm thấy người chơi.
      </div>

      <div v-else class="flex flex-col gap-4">
        <div
          v-if="errorText"
          class="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-350"
        >
          {{ errorText }}
        </div>

        <!-- Avatar upload picker -->
        <div class="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <button
                class="relative h-14 w-14 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/60 active:scale-[0.96] transition-all"
                aria-label="Chọn ảnh avatar"
                :disabled="busy"
                @click="openAvatarPicker"
              >
                <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-lg font-bold text-zinc-500">+</div>
              </button>
              <div class="flex flex-col">
                <span class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">ẢNH ĐẠI DIỆN</span>
                <span class="text-[10px] text-zinc-600 mt-0.5">Tải lên từ thiết bị</span>
              </div>
            </div>
            <button
              class="h-9 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-4 text-xs font-bold text-zinc-300 active:scale-[0.96] transition-all disabled:opacity-30"
              :disabled="!avatarUrl"
              @click="removeAvatar"
            >
              Gỡ ảnh
            </button>
          </div>
          <input
            ref="fileInputEl"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onAvatarPicked"
          />
        </div>

        <!-- Real-time visual preview card (Horizontal Layout) -->
        <div>
          <div class="mb-2 text-[9px] font-black tracking-widest text-zinc-500 uppercase">XEM TRƯỚC THẺ</div>
          <div 
            class="flex h-16 w-full items-center justify-between overflow-hidden rounded-2xl border shadow-sm"
            :style="{ borderColor: selectedColor.hex + '4d', backgroundColor: selectedColor.hex + '24' }"
          >
            <!-- Left Section -->
            <div class="flex flex-1 items-center gap-3 min-w-0 pl-3.5 pr-2">
              <div class="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/60">
                <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover" />
                <div 
                  v-else 
                  class="absolute inset-0 flex items-center justify-center text-sm font-extrabold select-none"
                  :style="{ backgroundColor: selectedColor.hex + '33', color: '#ffffff' }"
                >
                  {{ draftName.slice(0, 1).toUpperCase() || '?' }}
                </div>
              </div>
              <input
                v-model="draftName"
                class="h-9 w-full min-w-0 appearance-none border-0 bg-transparent px-0 text-sm font-bold tracking-tight text-zinc-200 outline-none placeholder:text-zinc-650 focus:outline-none focus:ring-0 focus:text-white"
                placeholder="Tên người chơi"
                @keydown.enter.prevent="commitName"
                @blur="commitName"
              />
            </div>
            
            <!-- Right Section -->
            <div
              class="flex h-full w-24 flex-shrink-0 items-center justify-center border-l bg-zinc-950/20"
              :style="{ borderLeftColor: selectedColor.hex + '4d' }"
            >
              <div class="text-2xl font-black tracking-tight tabular-nums" :style="{ color: selectedColor.hex }">
                {{ player.score }}
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Color Selector -->
        <div class="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-4">
          <div class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">MÀU CHỦ ĐẠO</div>
          <div class="mt-3 grid grid-cols-4 gap-3.5">
            <button
              v-for="c in PLAYER_COLOR_OPTIONS"
              :key="c.key"
              class="aspect-square touch-manipulation rounded-full border border-zinc-900 transition-all active:scale-[0.92] disabled:opacity-40"
              :class="player.colorKey === c.key ? 'ring-2 ring-zinc-400 ring-offset-2 ring-offset-zinc-950' : 'hover:border-zinc-700/60'"
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
