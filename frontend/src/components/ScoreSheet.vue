<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Ball, Player } from '../stores/board'

const props = defineProps<{
  actorPlayerId: string | null
  players: Player[]
  scoresByPlayerId: Record<string, number>
}>()

const emit = defineEmits<{
  (e: 'confirm', actorPlayerId: string, targetPlayerId: string, ball: Ball): void
}>()

const ball = ref<Ball | null>(null)
const targetPlayerId = ref<string | null>(null)

watch(
  () => props.actorPlayerId,
  () => {
    ball.value = null
    targetPlayerId.value = null
  },
)

const actor = computed(() => props.players.find((p) => p.id === props.actorPlayerId) ?? null)

const targets = computed(() => {
  const actorId = props.actorPlayerId
  return props.players
    .filter((p) => p.id !== actorId)
    .slice()
    .sort((a, b) => (props.scoresByPlayerId[b.id] ?? 0) - (props.scoresByPlayerId[a.id] ?? 0))
})

const canConfirm = computed(() => Boolean(props.actorPlayerId && ball.value && targetPlayerId.value))

function onConfirm() {
  if (!props.actorPlayerId || !ball.value || !targetPlayerId.value) return
  emit('confirm', props.actorPlayerId, targetPlayerId.value, ball.value)
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
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="b in ([3, 6, 9] as Ball[])"
          :key="b"
          class="h-12 touch-manipulation rounded-2xl border border-zinc-800 bg-zinc-900/40 text-sm font-semibold text-zinc-100 transition-colors active:bg-zinc-800 active:scale-[0.98]"
          :class="ball === b ? 'border-violet-400 bg-violet-500/15' : ''"
          @click="ball = b"
        >
          Bi {{ b }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="text-xs font-semibold tracking-wide text-zinc-500">NGƯỜI BỊ TRỪ</div>
      <div class="flex flex-col gap-2">
        <button
          v-for="p in targets"
          :key="p.id"
          class="flex touch-manipulation items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left transition-colors active:bg-zinc-800 active:scale-[0.99]"
          :class="targetPlayerId === p.id ? 'border-violet-400 bg-violet-500/15' : ''"
          @click="targetPlayerId = p.id"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold text-zinc-100">{{ p.name }}</div>
            <div class="mt-0.5 text-xs text-zinc-500">
              điểm hiện tại: <span class="font-semibold tabular-nums text-zinc-200">{{ scoresByPlayerId[p.id] ?? 0 }}</span>
            </div>
          </div>
          <div class="ml-3 text-xs font-semibold text-zinc-400">#{{ p.sortOrder }}</div>
        </button>
      </div>
    </div>

    <button
      class="mt-1 inline-flex h-12 touch-manipulation items-center justify-center rounded-2xl bg-violet-500 px-4 text-base font-semibold text-zinc-950 transition-colors active:bg-violet-400 active:scale-[0.98] disabled:opacity-40"
      :disabled="!canConfirm"
      @click="onConfirm"
    >
      Xác nhận
    </button>
  </div>
</template>
