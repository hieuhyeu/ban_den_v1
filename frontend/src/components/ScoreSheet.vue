<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

function resetPick() {
  selectedBalls.value = []
  targetPlayerId.value = null
  busy.value = false
}

function toggleBall(b: Ball) {
  if (busy.value) return
  const cur = selectedBalls.value
  if (cur.includes(b)) selectedBalls.value = cur.filter((x) => x !== b)
  else selectedBalls.value = cur.concat(b)
}

watch(
  () => props.actorPlayerId,
  () => {
    resetPick()
  },
)

watch(
  () => props.open,
  (v) => {
    if (v) resetPick()
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

function initialOf(name: string) {
  const t = (name ?? '').trim()
  return t ? t.slice(0, 1).toUpperCase() : '?'
}
</script>

<template>
  <div v-if="!actor" class="text-sm text-zinc-400">Chọn người ghi điểm.</div>

  <div v-else class="flex flex-col gap-4">
    <div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div class="text-xs font-semibold tracking-wide text-zinc-500">NGƯỜI ĂN</div>
      <div class="mt-1 text-base font-semibold text-zinc-100">{{ actor.name }}</div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="text-xs font-semibold tracking-wide text-zinc-500">CHỌN BI</div>
      <div class="flex items-center justify-between gap-3">
        <button
          v-for="b in ([3, 6, 9] as Ball[])"
          :key="b"
          class="relative flex h-20 w-20 touch-manipulation items-center justify-center rounded-full border-2 bg-zinc-900/40 p-[5px] transition-colors active:bg-zinc-800 active:scale-[0.98]"
          :class="selectedBalls.includes(b) ? 'border-zinc-100/80' : 'border-transparent'"
          :aria-pressed="selectedBalls.includes(b)"
          @click="toggleBall(b)"
        >
          <div class="h-full w-full overflow-hidden rounded-full bg-zinc-950/40">
            <img :src="BALL_IMAGE[b]" alt="" class="h-full w-full object-cover" loading="lazy" />
          </div>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="text-xs font-semibold tracking-wide text-zinc-500">NGƯỜI BỊ TRỪ</div>
      <div class="flex flex-col gap-2">
        <button
          v-for="p in targets"
          :key="p.id"
          class="flex touch-manipulation items-center justify-between gap-3 rounded-2xl border-2 border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left transition-colors active:bg-zinc-800 active:scale-[0.99]"
          :class="targetPlayerId === p.id ? 'border-zinc-100/80' : ''"
          :disabled="busy"
          @click="onTargetTap(p.id)"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div class="h-10 w-10 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/40">
              <img v-if="p.avatarUrl" :src="p.avatarUrl" alt="" class="h-full w-full object-cover" />
              <div v-else class="flex h-full w-full items-center justify-center text-sm font-black text-zinc-400">
                {{ initialOf(p.name) }}
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-zinc-100">{{ p.name }}</div>
              <div class="mt-0.5 text-xs font-semibold text-zinc-500">Điểm hiện tại</div>
            </div>
          </div>

          <div class="text-right">
            <div class="text-lg font-extrabold tabular-nums text-zinc-100">{{ scoresByPlayerId[p.id] ?? 0 }}</div>
          </div>
        </button>
      </div>
    </div>

    <div class="h-1" />
  </div>
</template>
