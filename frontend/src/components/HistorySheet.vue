<script setup lang="ts">
import type { Player, ScoreEvent } from '../stores/board'

defineProps<{
  history: Array<ScoreEvent & { applied: boolean }>
  players: Player[]
}>()

function nameById(players: Player[], id: string) {
  return players.find((p) => p.id === id)?.name ?? 'Unknown'
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div v-if="history.length === 0" class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
    Chưa có lịch sử.
  </div>

  <div v-else class="flex flex-col gap-2">
    <div
      v-for="e in history.slice().reverse()"
      :key="e.seq"
      class="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
      :class="e.isDeleted ? 'opacity-25' : e.applied ? '' : 'opacity-40'"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold text-zinc-100">
            {{ nameById(players, e.actorPlayerId) }} ăn bi {{ e.ball }} của
            {{ nameById(players, e.targetPlayerId) }}
          </div>
          <div class="mt-1 text-xs text-zinc-500">#{{ e.seq }} · {{ formatTime(e.createdAt) }}</div>
        </div>

        <div class="flex items-end gap-2 text-right">
          <div v-if="e.isDeleted" class="text-[10px] font-black tracking-widest text-zinc-500">DELETED</div>
          <div class="text-xs font-semibold text-emerald-300">+{{ e.value }}</div>
          <div class="text-xs font-semibold text-rose-300">-{{ e.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
