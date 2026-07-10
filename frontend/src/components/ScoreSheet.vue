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
}>()

const selectedBalls = ref<Ball[]>([])
const targetPlayerId = ref<string | null>(null)
const busy = ref(false)
const imgLoadedMap = ref<Record<string, boolean>>({})

function resetPick() {
  selectedBalls.value = []
  targetPlayerId.value = null
  busy.value = false
  imgLoadedMap.value = {}
}

function toggleBall(b: Ball) {
  if (busy.value) return
  const cur = selectedBalls.value
  if (cur.includes(b)) selectedBalls.value = cur.filter((x) => x !== b)
  else selectedBalls.value = cur.concat(b)
}

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
  if (!selectedBalls.value.length) return
  busy.value = true
  targetPlayerId.value = id
  emit('confirmMulti', props.actorPlayerId, id, selectedBalls.value.slice())
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

  <div v-else class="flex flex-col gap-4 pt-1">
    <!-- Ball selection -->
    <div class="flex flex-col gap-2">
      <div class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">CHỌN BI</div>
      <div class="flex items-center justify-around gap-2 px-1 py-1">
        <button
          v-for="b in ([3, 6, 9] as Ball[])"
          :key="b"
          class="relative flex h-16 w-16 touch-manipulation items-center justify-center rounded-full transition-all duration-200 active:scale-[0.93]"
          :class="selectedBalls.includes(b) ? 'ring-2 ring-zinc-200 ring-offset-4 ring-offset-[#070b09] scale-105 bg-zinc-900/60 shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'bg-zinc-950/30 opacity-40'"
          :aria-pressed="selectedBalls.includes(b)"
          @click="toggleBall(b)"
        >
          <div class="h-full w-full overflow-hidden rounded-full shadow-inner bg-zinc-950/45">
            <img :src="BALL_IMAGE[b]" alt="" class="h-full w-full object-cover select-none" loading="lazy" />
          </div>
        </button>
      </div>
    </div>

    <!-- Target Selection Bento Grid -->
    <div class="flex flex-col gap-2">
      <div class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">AI BỊ TRỪ ĐIỂM?</div>
      <div 
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

