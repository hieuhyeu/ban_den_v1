<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import BottomSheet from '../components/BottomSheet.vue'
import HeaderBar from '../components/HeaderBar.vue'
import { useAuthStore } from '../stores/auth'
import { PLAYER_COLOR_OPTIONS, useBoardStore } from '../stores/board'

const LS_POOL = 'ban_den_random_pool_v1'

const router = useRouter()
const auth = useAuthStore()
const board = useBoardStore()

const menuOpen = ref(false)

const poolIds = ref<string[]>([])
const resultOpen = ref(false)
const pickedId = ref<string | null>(null)
const spinning = ref(false)
const noop = () => {}

function loadPool() {
  const raw = localStorage.getItem(LS_POOL)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { poolIds: string[] }
    if (!parsed || !Array.isArray(parsed.poolIds)) return null
    return parsed.poolIds
  } catch {
    return null
  }
}

function persistPool(ids: string[]) {
  localStorage.setItem(LS_POOL, JSON.stringify({ poolIds: ids }))
}

watchEffect(() => {
  const ids = board.activePlayers.map((p) => p.id)
  const stored = loadPool()
  if (!stored) {
    poolIds.value = ids
    persistPool(ids)
    return
  }
  const filtered = stored.filter((id) => ids.includes(id))
  poolIds.value = filtered.length ? filtered : ids
  persistPool(poolIds.value)
})

const poolPlayers = computed(() => board.activePlayers.filter((p) => poolIds.value.includes(p.id)))

const canvasEl = ref<HTMLCanvasElement | null>(null)
let drawRafId = 0
let spinRafId = 0

const rotation = ref(0)

onMounted(async () => {
  if (!board.board) await board.refresh()
})

function hexByKey(key: string) {
  return PLAYER_COLOR_OPTIONS.find((x) => x.key === key)?.hex ?? '#A855F7'
}

function drawWheel() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const n = poolPlayers.value.length
  const w = canvas.width
  const h = canvas.height
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.46

  ctx.clearRect(0, 0, w, h)

  ctx.save()
  ctx.translate(cx, cy)

  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(9, 9, 11, 0.65)'
  ctx.fill()

  if (n === 0) {
    ctx.fillStyle = 'rgba(161, 161, 170, 0.7)'
    ctx.font = `${Math.floor(r * 0.14)}px ui-sans-serif, system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Pool trống', 0, 0)
    ctx.restore()
    return
  }

  const slice = (Math.PI * 2) / n
  const startAngle = -Math.PI / 2

  ctx.rotate(rotation.value % (Math.PI * 2))

  for (let i = 0; i < n; i++) {
    const p = poolPlayers.value[i]!
    const a0 = startAngle + i * slice
    const a1 = a0 + slice

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, r, a0, a1)
    ctx.closePath()

    ctx.fillStyle = hexByKey(p.colorKey)
    ctx.globalAlpha = 0.9
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.lineWidth = Math.max(2, r * 0.03)
    ctx.strokeStyle = 'rgba(9, 9, 11, 0.85)'
    ctx.stroke()

    const mid = (a0 + a1) / 2
    ctx.save()
    ctx.rotate(mid)
    ctx.translate(r * 0.62, 0)
    ctx.rotate(Math.PI / 2)
    ctx.fillStyle = 'rgba(9, 9, 11, 0.95)'
    ctx.font = `900 ${Math.floor(r * 0.12)}px ui-sans-serif, system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const name = (p.name ?? '').slice(0, 10)
    ctx.fillText(name, 0, 0)
    ctx.restore()
  }

  ctx.beginPath()
  ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(9, 9, 11, 0.9)'
  ctx.fill()
  ctx.lineWidth = Math.max(2, r * 0.02)
  ctx.strokeStyle = 'rgba(244, 244, 245, 0.5)'
  ctx.stroke()

  ctx.restore()
}

function resizeCanvas() {
  const canvas = canvasEl.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  drawWheel()
}

onMounted(async () => {
  await nextTick()
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (drawRafId) cancelAnimationFrame(drawRafId)
  if (spinRafId) cancelAnimationFrame(spinRafId)
})

function scheduleDraw() {
  if (drawRafId) cancelAnimationFrame(drawRafId)
  drawRafId = requestAnimationFrame(drawWheel)
}

watch(poolPlayers, scheduleDraw)

watch(
  poolPlayers,
  async () => {
    await nextTick()
    resizeCanvas()
  },
  { flush: 'post' },
)

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function spin() {
  if (spinning.value) return
  if (poolIds.value.length === 0) return
  const n = poolIds.value.length
  const idx = Math.floor(Math.random() * n)
  const slice = (Math.PI * 2) / n
  const base = -(idx + 0.5) * slice
  const current = rotation.value
  const k = Math.ceil((current - base) / (Math.PI * 2)) + 4
  const target = base + Math.PI * 2 * k

  const from = current
  const delta = target - from
  const start = performance.now()
  const duration = 1350

  spinning.value = true

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    rotation.value = from + delta * easeOutCubic(t)
    drawWheel()
    if (t < 1) {
      spinRafId = requestAnimationFrame(step)
      return
    }
    rotation.value = target
    drawWheel()
    pickedId.value = poolIds.value[idx] ?? null
    resultOpen.value = true
    spinning.value = false
  }
  spinRafId = requestAnimationFrame(step)
}

function keepAndRemove() {
  if (!pickedId.value) return
  poolIds.value = poolIds.value.filter((id) => id !== pickedId.value)
  persistPool(poolIds.value)
  pickedId.value = null
  resultOpen.value = false
}

function keepInPool() {
  pickedId.value = null
  resultOpen.value = false
}

function resetPool() {
  poolIds.value = board.activePlayers.map((p) => p.id)
  persistPool(poolIds.value)
}

function onLogout() {
  auth.logout()
  router.replace({ name: 'login' })
}

function goScoreboard() {
  menuOpen.value = false
  router.push({ name: 'scoreboard' })
}

function goRandom() {
  menuOpen.value = false
  router.push({ name: 'random' })
}

const pickedPlayer = computed(() => board.activePlayers.find((p) => p.id === pickedId.value) ?? null)
const pickedName = computed(() => pickedPlayer.value?.name ?? '')
const pickedColor = computed(() => {
  const key = pickedPlayer.value?.colorKey
  return PLAYER_COLOR_OPTIONS.find((c) => c.key === key) ?? PLAYER_COLOR_OPTIONS[0]!
})
</script>

<template>
  <div class="mx-auto flex min-h-[100svh] w-full max-w-md flex-col">
    <HeaderBar
      title="Random"
      :can-undo="false"
      :can-redo="false"
      :show-undo="false"
      :show-redo="false"
      :show-history="false"
      :show-add="false"
      @menu="menuOpen = true"
      @undo="noop"
      @redo="noop"
      @history="noop"
      @add="noop"
    />

    <div class="flex-1 px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-4">
      <div class="mb-4 flex items-center justify-end">
        <button class="text-xs font-semibold text-zinc-400 active:text-zinc-200" @click="resetPool">
          Đặt lại
        </button>
      </div>

      <div class="rounded-3xl border-2 border-zinc-800 bg-zinc-900/30 p-5 shadow-[0_14px_0_0_rgba(0,0,0,0.35)]">
        <div class="text-base font-extrabold tracking-tight text-zinc-100">Vòng xoáy</div>
        <div class="mt-1 text-sm text-zinc-400">Chạm “Quay” để chọn ngẫu nhiên.</div>

        <div class="relative mx-auto mt-5 w-full max-w-[320px]">
          <div class="absolute left-1/2 top-[-8px] z-10 -translate-x-1/2">
            <div class="h-0 w-0 border-x-[10px] border-b-[16px] border-x-transparent border-b-zinc-100 drop-shadow" />
          </div>
          <div class="aspect-square w-full rounded-[32px] border-2 border-zinc-800 bg-zinc-950/40 p-3 shadow-[0_14px_0_0_rgba(0,0,0,0.35)]">
            <canvas ref="canvasEl" class="h-full w-full rounded-[24px]" />
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <div
            v-for="p in poolPlayers"
            :key="p.id"
            class="rounded-2xl border-2 border-zinc-800 px-3 py-2 text-sm font-black text-zinc-950 saturate-150"
            :style="{ backgroundColor: PLAYER_COLOR_OPTIONS.find((c) => c.key === p.colorKey)?.hex ?? '#A855F7' }"
          >
            {{ p.name }}
          </div>
          <div v-if="poolPlayers.length === 0" class="text-sm text-zinc-500">Pool trống. Reset để quay lại.</div>
        </div>

        <button
          class="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-violet-500 text-base font-extrabold text-zinc-950 shadow-[0_10px_0_0_rgba(0,0,0,0.25)] active:bg-violet-400 active:scale-[0.99] disabled:opacity-40"
          :disabled="poolPlayers.length === 0 || spinning"
          @click="spin"
        >
          {{ spinning ? 'Đang quay…' : 'Quay' }}
        </button>
      </div>
    </div>

    <BottomSheet v-model="menuOpen" title="Menu">
      <div class="flex flex-col gap-2">
        <button
          class="h-12 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 text-left text-sm font-semibold text-zinc-100 active:bg-zinc-800"
          @click="goScoreboard"
        >
          Tính điểm
        </button>
        <button
          class="h-12 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 text-left text-sm font-semibold text-zinc-100 active:bg-zinc-800"
          @click="goRandom"
        >
          Vòng xoay random
        </button>
        <button
          class="mt-2 h-12 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 text-left text-sm font-semibold text-rose-200 active:bg-rose-500/20"
          @click="onLogout"
        >
          Đăng xuất
        </button>
      </div>
    </BottomSheet>

    <BottomSheet v-model="resultOpen" title="Kết quả">
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div class="text-xs font-semibold tracking-wide text-zinc-500">TRÚNG</div>
        <div
          class="mt-2 flex items-center justify-between gap-3 rounded-2xl border-2 border-zinc-800 px-4 py-3 text-lg font-black text-zinc-950 saturate-150"
          :style="{ backgroundColor: pickedColor.hex }"
        >
          <div class="min-w-0 flex-1 truncate">{{ pickedName }}</div>
          <div class="text-xs font-black tracking-widest text-zinc-950/70">OK</div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <button
          class="h-12 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-sm font-semibold text-zinc-100 active:bg-zinc-800"
          @click="keepInPool"
        >
          Giữ lại
        </button>
        <button
          class="h-12 rounded-2xl bg-violet-500 text-sm font-semibold text-zinc-950 active:bg-violet-400"
          @click="keepAndRemove"
        >
          Xóa
        </button>
      </div>
    </BottomSheet>
  </div>
</template>
