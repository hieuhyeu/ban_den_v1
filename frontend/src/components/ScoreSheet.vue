<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PLAYER_COLOR_OPTIONS } from '../stores/board'
import type { Ball, Player } from '../stores/board'
import ball3Url from '../assets/balls_images/RBABK_03.webp'
import ball6Url from '../assets/balls_images/RBABK_06.webp'
import ball9Url from '../assets/balls_images/RBABK_09.webp'

const props = defineProps<{
  open: boolean
  actorPlayerId: string | null
  players: Player[]
  scoresByPlayerId: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'confirmMulti', actorPlayerId: string, targetPlayerId: string, balls: Ball[]): void
  (e: 'confirmAnLang'): void
  (e: 'selectionChange', payload: { canAnLang: boolean; doubleSelected: Ball[]; selectedBalls: Ball[] }): void
}>()

const ballSelections = ref<Record<Ball, number>>({ 3: 0, 6: 0, 9: 0 })
const targetPlayerId = ref<string | null>(null)
const busy = ref(false)
const imgLoadedMap = ref<Record<string, boolean>>({})

const doubleSelectedBalls = computed(() => {
  return ([3, 6, 9] as Ball[]).filter(b => ballSelections.value[b] === 2)
})

const singleSelectedBalls = computed(() => {
  return ([3, 6, 9] as Ball[]).filter(b => ballSelections.value[b] === 1)
})

const selectedBalls = computed(() => {
  return ([3, 6, 9] as Ball[]).filter(b => ballSelections.value[b] > 0)
})

const hasSingle = computed(() => singleSelectedBalls.value.length > 0)

function resetPick() {
  ballSelections.value = { 3: 0, 6: 0, 9: 0 }
  targetPlayerId.value = null
  busy.value = false
  imgLoadedMap.value = {}
}

function toggleBall(b: Ball) {
  if (busy.value) return
  const current = ballSelections.value[b]
  if (current === 0) {
    ballSelections.value[b] = 1 // click 1st time
  } else if (current === 1) {
    ballSelections.value[b] = 2 // click 2nd time (Ăn Làng)
  } else {
    ballSelections.value[b] = 0 // click 3rd time (Hủy)
  }
}

watch(
  ballSelections,
  () => {
    const double = doubleSelectedBalls.value
    const single = singleSelectedBalls.value
    const canAnLang = double.length > 0 && single.length === 0
    emit('selectionChange', {
      canAnLang,
      doubleSelected: double,
      selectedBalls: selectedBalls.value
    })
  },
  { deep: true }
)

function prefetchAvatars() {
  props.players.forEach((p) => {
    if (p.avatarUrl) {
      const img = new Image()
      img.src = p.avatarUrl
      img.onload = () => {
        imgLoadedMap.value[p.id] = true
      }
    }
  })
}

watch(
  () => props.actorPlayerId,
  () => {
    resetPick()
    if (props.open) prefetchAvatars()
  },
)

watch(
  () => props.open,
  (v) => {
    if (v) {
      resetPick()
      prefetchAvatars()
    }
  },
)

function onTargetTap(id: string) {
  if (busy.value) return
  if (!props.actorPlayerId) return
  if (!singleSelectedBalls.value.length) return
  busy.value = true
  targetPlayerId.value = id
  emit('confirmMulti', props.actorPlayerId, id, singleSelectedBalls.value.slice())
}

const actor = computed(() => props.players.find((p) => p.id === props.actorPlayerId) ?? null)

const targets = computed(() => {
  const actorId = props.actorPlayerId
  return props.players.filter((p) => p.id !== actorId)
})

const BALL_IMAGE: Record<Ball, string> = {
  3: ball3Url,
  6: ball6Url,
  9: ball9Url,
}

function hexByKey(key: string) {
  return PLAYER_COLOR_OPTIONS.find((x) => x.key === key)?.hex ?? '#A855F7'
}
</script>

<template>
  <div v-if="!actor" class="py-4 text-center text-xs text-zinc-500 font-medium uppercase tracking-wider">
    Chọn người chơi trên danh sách.
  </div>
  <div v-else class="flex flex-col gap-4 pt-1 min-h-[240px]">
    <!-- Ball selection -->
    <div class="flex flex-col gap-2">
      <div class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">CHỌN BI</div>
      <div class="flex items-center justify-around gap-2 px-1 py-1">
        <button
          v-for="b in ([3, 6, 9] as Ball[])"
          :key="b"
          class="relative flex h-16 w-16 touch-manipulation items-center justify-center rounded-full transition-all duration-200 active:scale-[0.93]"
          :class="[
            ballSelections[b] > 0 ? 'scale-105 bg-zinc-900/60 shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'bg-zinc-950/30 opacity-40',
            ballSelections[b] === 1 ? 'ring-2 ring-zinc-200 ring-offset-4 ring-offset-[#070b09]' : '',
            ballSelections[b] === 2 ? 'ring-2 ring-emerald-400 ring-offset-4 ring-offset-[#070b09]' : ''
          ]"
          @click="toggleBall(b)"
        >
          <!-- Outer ring wrapper for double select -->
          <div 
            v-if="ballSelections[b] === 2"
            class="absolute -inset-2.5 rounded-full border border-emerald-400/40 animate-pulse"
          />
          <div class="h-full w-full overflow-hidden rounded-full shadow-inner bg-zinc-950/45 relative z-10">
            <img :src="BALL_IMAGE[b]" alt="" class="h-full w-full object-cover select-none" loading="lazy" />
          </div>
        </button>
      </div>
    </div>

    <!-- Target Selection Bento Grid -->
    <div class="flex flex-col gap-2">
      <div class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">AI BỊ TRỪ ĐIỂM?</div>
      
      <!-- Ăn Làng to button -->
      <div v-if="doubleSelectedBalls.length > 0" class="w-full">
        <button
          class="flex h-20 w-full touch-manipulation items-center justify-center rounded-xl font-black text-xs tracking-widest uppercase transition-all duration-200"
          :class="[
            !hasSingle ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:bg-emerald-400 active:scale-[0.98]' : 'bg-zinc-900 border border-zinc-800 text-zinc-650 cursor-not-allowed opacity-50'
          ]"
          :disabled="hasSingle"
          @click="emit('confirmAnLang')"
        >
          {{ hasSingle ? 'Thao tác không hợp lệ' : 'ĂN LÀNG' }}
        </button>
      </div>

      <div 
        v-else
        class="grid gap-2 transition-all duration-300"
        :class="[
          targets.length === 1 ? 'grid-cols-1' : 
          targets.length === 2 ? 'grid-cols-2' : 
          'grid-cols-3'
        ]"
      >
        <button
          v-for="p in targets"
          :key="p.id"
          class="flex flex-col touch-manipulation items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/20 p-3 text-center transition-all duration-200 active:scale-[0.96] disabled:opacity-30"
          :class="[
            targetPlayerId === p.id ? 'border-zinc-400 bg-zinc-900/40 shadow-sm' : 'hover:border-zinc-800',
            selectedBalls.length === 0 ? 'opacity-30 pointer-events-none' : ''
          ]"
          :disabled="busy || selectedBalls.length === 0"
          @click="onTargetTap(p.id)"
        >
          <!-- Squircle Avatar with Monogram Fallback -->
          <div class="relative h-10 w-10 overflow-hidden rounded-lg bg-zinc-950/40 border border-zinc-900/60">
            <img 
              v-if="p.avatarUrl" 
              :src="p.avatarUrl" 
              alt="" 
              class="h-full w-full object-cover transition-opacity duration-200" 
              :class="imgLoadedMap[p.id] ? 'opacity-100' : 'opacity-0'"
              @load="imgLoadedMap[p.id] = true"
            />
            <div 
              v-if="!p.avatarUrl || !imgLoadedMap[p.id]" 
              class="absolute inset-0 flex items-center justify-center text-sm font-black select-none"
              :style="{ backgroundColor: hexByKey(p.colorKey) + '15', color: hexByKey(p.colorKey) }"
            >
              {{ p.name.slice(0, 1).toUpperCase() }}
            </div>
          </div>

          <!-- Name & Current Score -->
          <div class="mt-2.5 w-full min-w-0">
            <div class="truncate text-[10px] font-bold text-zinc-350 uppercase tracking-wide">{{ p.name }}</div>
            <div class="mt-0.5 font-mono text-sm font-black tracking-tight text-zinc-250 tabular-nums">
              {{ scoresByPlayerId[p.id] ?? 0 }}
            </div>
          </div>
        </button>
      </div>
    </div>

    <div class="h-1" />
  </div>
</template>

