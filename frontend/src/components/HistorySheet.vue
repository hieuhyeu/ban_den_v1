<script setup lang="ts">
import { computed } from 'vue'
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

function initialOf(name: string) {
  const t = (name ?? '').trim()
  return t ? t.slice(0, 1).toUpperCase() : '?'
}

const playerById = computed(() => {
  const out: Record<string, { name: string; avatarUrl: string; colorHex: string }> = {}
  for (const p of props.players) {
    out[p.id] = { name: p.name, avatarUrl: p.avatarUrl ?? '', colorHex: hexByKey(p.colorKey) }
  }
  return out
})

const reversedHistory = computed(() => props.history.slice().reverse())

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="pt-2.5">
    <div
      v-if="history.length === 0"
      class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400"
    >
      Chưa có lịch sử.
    </div>

    <div v-else class="mt-2.5 flex flex-col gap-2">
      <div
        v-for="e in reversedHistory"
        :key="e.seq"
        class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
        :class="[
          e.isDeleted ? 'opacity-25' : e.applied ? '' : 'opacity-50',
          !e.isDeleted && !e.applied ? 'history-stripes' : '',
          !e.isDeleted && props.cursor > 0 && e.seq === props.cursor ? 'history-highlight-current' : '',
        ]"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-xs font-semibold text-zinc-500">#{{ e.seq }} · {{ formatTime(e.createdAt) }}</div>
          <div class="flex items-center gap-2">
            <div
              v-if="e.isDeleted"
              class="rounded-full border border-zinc-700 bg-zinc-950/40 px-2 py-1 text-[10px] font-black tracking-widest text-zinc-400"
            >
              DELETED
            </div>
            <div class="h-8 w-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40">
              <img :src="BALL_IMAGE[e.ball]" :alt="`Bi ${e.ball}`" class="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>

        <div class="mt-2.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
          <div class="flex min-w-0 items-center gap-2">
            <div class="h-9 w-9 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/40">
              <img
                v-if="playerById[e.actorPlayerId]?.avatarUrl"
                :src="playerById[e.actorPlayerId]?.avatarUrl"
                alt=""
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-sm font-black text-zinc-400">
                {{ initialOf(playerById[e.actorPlayerId]?.name ?? '') }}
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <div class="h-2 w-2 rounded-full" :style="{ backgroundColor: playerById[e.actorPlayerId]?.colorHex }" />
                <div class="truncate text-sm font-semibold text-zinc-100">
                  {{ playerById[e.actorPlayerId]?.name ?? 'Unknown' }}
                </div>
              </div>
              <div class="mt-0.5 text-[11px] font-semibold text-zinc-500">Ăn bi</div>
            </div>
          </div>
          <div class="flex items-center justify-end">
            <div class="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-extrabold tabular-nums text-emerald-200">
              +{{ e.value }}
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-2">
            <div class="h-9 w-9 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/40">
              <img
                v-if="playerById[e.targetPlayerId]?.avatarUrl"
                :src="playerById[e.targetPlayerId]?.avatarUrl"
                alt=""
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-sm font-black text-zinc-400">
                {{ initialOf(playerById[e.targetPlayerId]?.name ?? '') }}
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <div class="h-2 w-2 rounded-full" :style="{ backgroundColor: playerById[e.targetPlayerId]?.colorHex }" />
                <div class="truncate text-sm font-semibold text-zinc-100">
                  {{ playerById[e.targetPlayerId]?.name ?? 'Unknown' }}
                </div>
              </div>
              <div class="mt-0.5 text-[11px] font-semibold text-zinc-500">Bị trừ</div>
            </div>
          </div>
          <div class="flex items-center justify-end">
            <div class="rounded-full bg-rose-500/15 px-3 py-1 text-sm font-extrabold tabular-nums text-rose-200">
              -{{ e.value }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
