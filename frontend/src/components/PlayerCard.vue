<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { PLAYER_COLOR_OPTIONS } from '../stores/board'
import type { Player } from '../stores/board'

const props = defineProps<{
  player: Player
  score: number
}>()

const emit = defineEmits<{
  (e: 'rename', playerId: string, name: string): void
  (e: 'tapScore', playerId: string): void
  (e: 'edit', playerId: string): void
}>()

const draft = ref(props.player.name)

const bump = ref<'up' | 'down' | null>(null)
const bumpClass = computed(() => {
  if (bump.value === 'up') return 'score-bump-up'
  if (bump.value === 'down') return 'score-bump-down'
  return ''
})
let bumpTimer: number | null = null

watch(
  () => props.player.name,
  (v) => {
    draft.value = v
  },
)

watch(
  () => props.score,
  (v, old) => {
    const delta = v - old
    if (!delta) return
    bump.value = delta > 0 ? 'up' : 'down'
    if (bumpTimer) window.clearTimeout(bumpTimer)
    bumpTimer = window.setTimeout(() => {
      bump.value = null
    }, 240)
  },
)

onUnmounted(() => {
  if (bumpTimer) window.clearTimeout(bumpTimer)
})

function commitName() {
  const n = draft.value.trim()
  if (n) emit('rename', props.player.id, n)
}

function cancelName() {
  draft.value = props.player.name
}

const selectedColor = computed(() => {
  const key = props.player.colorKey
  return PLAYER_COLOR_OPTIONS.find((x) => x.key === key) ?? PLAYER_COLOR_OPTIONS[0]!
})

const avatarUrl = computed(() => props.player.avatarUrl ?? '')
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden rounded-[28px] border-2 border-zinc-800 shadow-[0_14px_0_0_rgba(0,0,0,0.35)]">
    <div
      class="flex items-center gap-2 border-b-2 border-zinc-900/70 px-2 py-1.5 saturate-150"
      :class="selectedColor.headerClass"
    >
      <div class="h-8 w-8 overflow-hidden rounded-2xl border-2 border-zinc-950/30 bg-zinc-950/20" aria-hidden="true">
        <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover" />
        <div v-else class="flex h-full w-full items-center justify-center text-xs font-black text-zinc-950/60">
          {{ player.name.slice(0, 1).toUpperCase() }}
        </div>
      </div>
      <input
        v-model="draft"
        class="h-8 w-full appearance-none border-0 bg-transparent px-0 text-base font-black tracking-tight text-zinc-950 outline-none placeholder:text-zinc-950/70 focus:outline-none focus:ring-0"
        placeholder="Tên người chơi"
        @keydown.enter.prevent="commitName"
        @keydown.esc.prevent="cancelName"
        @blur="commitName"
      />
      <button
        class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-2xl bg-zinc-950/15 text-zinc-950 active:bg-zinc-950/25 active:scale-[0.98]"
        aria-label="Chỉnh sửa người chơi"
        @click="emit('edit', player.id)"
      >
        <span class="text-lg leading-none">⋯</span>
      </button>
    </div>

    <button
      class="flex min-h-0 w-full flex-1 touch-manipulation items-center justify-center px-4 py-3 active:scale-[0.995]"
      aria-label="Ghi điểm"
      :style="{ backgroundColor: selectedColor.hex }"
      @click="emit('tapScore', player.id)"
    >
      <div class="flex flex-col items-center">
        <div class="text-[11px] font-black tracking-widest text-zinc-950/70">ĐIỂM</div>
        <div class="mt-1 text-5xl font-black tabular-nums text-zinc-950" :class="bumpClass">{{ score }}</div>
      </div>
    </button>
  </div>
</template>
