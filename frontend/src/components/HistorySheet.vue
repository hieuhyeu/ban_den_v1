<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PLAYER_COLOR_OPTIONS } from '../stores/board'
import type { Player, ScoreEvent } from '../stores/board'
import ball3Url from '../assets/balls_images/RBABK_03.webp'
import ball6Url from '../assets/balls_images/RBABK_06.webp'
import ball9Url from '../assets/balls_images/RBABK_09.webp'

const props = defineProps<{
  history: Array<ScoreEvent & { applied: boolean }>
  players: Player[]
  cursor: number
}>()

const BALL_IMAGE: Record<3 | 6 | 9, string> = {
  3: ball3Url,
  6: ball6Url,
  9: ball9Url,
}

function hexByKey(key: string) {
  return PLAYER_COLOR_OPTIONS.find((x) => x.key === key)?.hex ?? '#A855F7'
}

const playerById = computed(() => {
  const out: Record<string, { name: string; avatarUrl: string; colorHex: string }> = {}
  for (const p of props.players) {
    out[p.id] = { name: p.name, avatarUrl: p.avatarUrl ?? '', colorHex: hexByKey(p.colorKey) }
  }
  return out
})

const reversedHistory = computed(() => props.history.slice().reverse())

const highlightedSeq = ref<number | null>(null)
let highlightTimeout: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.history,
  (newHist, oldHist) => {
    if (!newHist || newHist.length === 0) return
    const maxSeq = Math.max(...newHist.map(e => e.seq))
    const oldMaxSeq = oldHist && oldHist.length > 0 ? Math.max(...oldHist.map(e => e.seq)) : 0
    if (maxSeq > oldMaxSeq) {
      highlightedSeq.value = maxSeq
      if (highlightTimeout) clearTimeout(highlightTimeout)
      highlightTimeout = setTimeout(() => {
        highlightedSeq.value = null
      }, 2000)
    }
  },
  { deep: true, immediate: true }
)

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="pt-1">
    <div
      v-if="history.length === 0"
      class="py-12 text-center text-xs text-zinc-500 font-medium uppercase tracking-wide"
    >
      Chưa có lịch sử.
    </div>

    <div v-else class="flex flex-col border border-zinc-800/60 rounded-xl divide-y divide-zinc-850/50 bg-zinc-950/20 overflow-hidden">
      <div
        v-for="e in reversedHistory"
        :key="e.seq"
        class="relative flex items-center justify-between gap-2 px-3 py-2.5 transition-all duration-700 ease-out"
        :class="[
          e.isDeleted ? 'opacity-20 line-through' : e.applied ? '' : 'opacity-40',
          !e.isDeleted && !e.applied ? 'history-stripes' : '',
          e.seq === highlightedSeq ? 'bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)] scale-[1.01] relative z-10' : '',
          !e.isDeleted && props.cursor > 0 && e.seq === props.cursor && e.seq !== highlightedSeq ? 'bg-zinc-900/60' : '',
        ]"
      >
        <!-- Left: Ball & Seq -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <div class="h-5 w-5 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/40 shadow-sm flex-shrink-0">
            <img :src="BALL_IMAGE[e.ball]" :alt="`Bi ${e.ball}`" class="h-full w-full object-cover select-none" loading="lazy" />
          </div>
          <span class="font-mono text-[9px] font-black text-zinc-500 tracking-tighter">#{{ e.seq }}</span>
        </div>

        <!-- Center: Flow representation (3 fixed columns to prevent shifting) -->
        <div class="flex flex-1 items-center justify-between min-w-0 px-1 font-sans">
          <!-- Actor (Left column, text aligned right) -->
          <div class="flex items-center justify-end gap-1.5 w-[38%] min-w-0 flex-shrink-0">
            <span class="truncate text-[11px] font-bold text-zinc-200 leading-none">
              {{ playerById[e.actorPlayerId]?.name ?? 'Unknown' }}
            </span>
            <span class="font-mono text-[9px] font-black text-emerald-400 flex-shrink-0">
              +{{ e.value }}
            </span>
          </div>

          <!-- Arrow separator (Center column, aligned center) -->
          <div class="flex items-center justify-center w-[20%] flex-shrink-0 select-none text-zinc-600 text-[10px] font-bold">
            &rarr;
          </div>

          <!-- Target (Right column, text aligned left) -->
          <div class="flex items-center justify-start gap-1.5 w-[42%] min-w-0 flex-shrink-0">
            <span class="truncate text-[11px] font-semibold text-zinc-400 leading-none">
              {{ playerById[e.targetPlayerId]?.name ?? 'Unknown' }}
            </span>
            <span class="font-mono text-[9px] font-black text-red-400 flex-shrink-0">
              -{{ e.value }}
            </span>
          </div>
        </div>

        <!-- Right: Time -->
        <div class="text-[8px] font-bold text-zinc-600 flex-shrink-0 select-none">
          {{ formatTime(e.createdAt) }}
        </div>
      </div>
    </div>
  </div>
</template>

