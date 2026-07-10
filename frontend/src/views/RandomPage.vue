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
  ctx.fillStyle = '#0a0d0c'
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
    ctx.strokeStyle = '#050807'
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
  void auth.logout()
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
  <div class="mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col bg-[#050807] bg-grain overflow-hidden">
    <HeaderBar
      title="Vòng Quay Ngẫu Nhiên"
      :can-undo="false"
      :can-redo="false"
      :show-undo="false"
      :show-redo="false"
      :show-history="false"
      :show-add="false"
      @menu="menuOpen = true"
    />

    <div class="flex-1 px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 overflow-y-auto">
      <div class="mb-4 flex items-center justify-between">
        <span class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">POOL QUAY</span>
        <button 
          class="text-[9px] font-black tracking-widest text-zinc-400 hover:text-zinc-200 active:scale-[0.98] transition-all uppercase" 
          @click="resetPool"
        >
          ĐẶT LẠI POOL
        </button>
      </div>

      <div class="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 shadow-sm backdrop-blur-sm">
        <!-- Pointer Needle -->
        <div class="relative mx-auto w-full max-w-[280px]">
          <div class="absolute left-1/2 top-[-8px] z-10 -translate-x-1/2">
            <div class="h-0 w-0 border-x-[8px] border-t-[14px] border-x-transparent border-t-zinc-200 drop-shadow-md" />
          </div>
          <div class="aspect-square w-full rounded-2xl border border-zinc-900 bg-zinc-950/30 p-2.5">
            <canvas ref="canvasEl" class="h-full w-full rounded-xl" />
          </div>
        </div>

        <!-- Muted Chip Pools -->
        <div class="mt-6 flex flex-wrap gap-2 justify-center">
          <div
            v-for="p in poolPlayers"
            :key="p.id"
            class="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all select-none"
            :style="{ borderColor: hexByKey(p.colorKey) + '44', backgroundColor: hexByKey(p.colorKey) + '15', color: hexByKey(p.colorKey) }"
          >
            <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: hexByKey(p.colorKey) }" />
            <span>{{ p.name }}</span>
          </div>
          <div v-if="poolPlayers.length === 0" class="text-xs font-bold text-zinc-500 py-2 uppercase tracking-wide">
            Pool quay trống. Vui lòng đặt lại.
          </div>
        </div>

        <button
          class="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-100 text-xs font-black tracking-widest text-zinc-950 uppercase hover:bg-white active:scale-[0.98] transition-all disabled:opacity-30"
          :disabled="poolPlayers.length === 0 || spinning"
          @click="spin"
        >
          {{ spinning ? 'ĐANG QUAY…' : 'QUAY NGẪU NHIÊN' }}
        </button>
      </div>
    </div>

    <!-- Bottom menu sheet -->
    <BottomSheet v-model="menuOpen" title="Menu">
      <div class="flex flex-col gap-2 mt-2">
        <button
          class="h-11 rounded-xl border border-zinc-900 bg-zinc-900/60 px-4 text-left text-xs font-bold tracking-wider text-zinc-200 hover:bg-zinc-850 active:scale-[0.99] transition-all uppercase"
          @click="goScoreboard"
        >
          Tính điểm
        </button>
        <button
          class="h-11 rounded-xl border border-zinc-900 bg-zinc-900/60 px-4 text-left text-xs font-bold tracking-wider text-zinc-200 hover:bg-zinc-850 active:scale-[0.99] transition-all uppercase"
          @click="goRandom"
        >
          Vòng xoay random
        </button>
        <button
          class="mt-3 h-11 rounded-xl border border-rose-950/30 bg-rose-950/10 px-4 text-left text-xs font-black tracking-widest text-rose-350 hover:bg-rose-950/20 active:scale-[0.99] transition-all uppercase"
          @click="onLogout"
        >
          Đăng xuất
        </button>
      </div>
    </BottomSheet>

    <!-- Spin Result sheet -->
    <BottomSheet v-model="resultOpen" title="Kết Quả">
      <div class="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 text-center mt-2">
        <div class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">CHỌN TRÚNG</div>
        
        <div class="mt-4 flex flex-col items-center justify-center">
          <!-- Monogram squircle large display -->
          <div 
            class="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black shadow-sm border"
            :style="{ backgroundColor: pickedColor.hex + '1a', color: pickedColor.hex, borderColor: pickedColor.hex + '40' }"
          >
            {{ pickedName.slice(0, 1).toUpperCase() }}
          </div>
          
          <div class="mt-3 text-sm font-black text-zinc-150 tracking-tight uppercase">{{ pickedName }}</div>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <button
          class="h-11 rounded-xl border border-zinc-900 bg-zinc-900/60 text-xs font-bold tracking-wider text-zinc-200 hover:bg-zinc-850 active:scale-[0.98] transition-all uppercase"
          @click="keepInPool"
        >
          Giữ lại pool
        </button>
        <button
          class="h-11 rounded-xl bg-zinc-100 text-xs font-black tracking-widest text-zinc-950 hover:bg-white active:scale-[0.98] transition-all uppercase"
          @click="keepAndRemove"
        >
          Xóa khỏi pool
        </button>
      </div>
    </BottomSheet>
  </div>
</template>
