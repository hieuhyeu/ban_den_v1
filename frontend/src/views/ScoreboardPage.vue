<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BottomSheet from '../components/BottomSheet.vue'
import HeaderBar from '../components/HeaderBar.vue'
import HistorySheet from '../components/HistorySheet.vue'
import PlayerCard from '../components/PlayerCard.vue'
import ScoreSheet from '../components/ScoreSheet.vue'
import { useAuthStore } from '../stores/auth'
import { useBoardStore } from '../stores/board'

const router = useRouter()
const auth = useAuthStore()
const board = useBoardStore()

const menuOpen = ref(false)
const historyOpen = ref(false)
const scoreOpen = ref(false)
const actorPlayerId = ref<string | null>(null)

const canUndo = computed(() => board.cursorSeq > 0)
const canRedo = computed(() => board.canRedo)
const canAdd = computed(() => board.canAddPlayer)

const playersSorted = computed(() => board.activePlayers.slice().sort((a, b) => a.sortOrder - b.sortOrder))

if (!board.board) board.hydrateFromCache()
if (!board.board) void board.refresh()

const initialLoading = computed(() => !board.board && board.loading)

function openScore(playerId: string) {
  actorPlayerId.value = playerId
  scoreOpen.value = true
}

function onConfirmMulti(actorId: string, targetId: string, balls: Array<3 | 6 | 9>) {
  void board.applyMultiBalls(actorId, targetId, balls)
  scoreOpen.value = false
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

function goEditPlayer(playerId: string) {
  router.push({ name: 'playerEdit', params: { id: playerId } })
}
</script>

<template>
  <div class="mx-auto flex h-[100svh] w-full max-w-md flex-col overflow-hidden">
    <HeaderBar
      title="Bắn đền"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :show-undo="false"
      :show-redo="false"
      :show-history="false"
      :show-add="false"
      @menu="menuOpen = true"
      @undo="board.undo()"
      @redo="board.redo()"
      @history="historyOpen = true"
      @add="board.addPlayer()"
    />

    <div class="flex min-h-0 flex-1 flex-col px-4 pt-3">

      <div v-if="initialLoading" class="flex flex-1 items-center justify-center">
        <div class="w-full rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 text-center">
          <div class="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-zinc-700 border-t-violet-500" />
          <div class="mt-3 text-sm font-semibold text-zinc-200">Đang tải dữ liệu…</div>
        </div>
      </div>

      <div v-else-if="playersSorted.length === 0" class="flex flex-1 items-center justify-center">
        <div class="w-full rounded-3xl border border-zinc-800 bg-zinc-900/30 p-5 text-center">
          <div class="text-base font-semibold text-zinc-100">Chưa có người chơi</div>
          <button
            class="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-violet-500 text-base font-semibold text-zinc-950 active:bg-violet-400"
            @click="board.addPlayer()"
          >
            Thêm người chơi
          </button>
        </div>
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col items-stretch justify-center gap-2 pb-3">
        <div v-for="p in playersSorted" :key="p.id" class="flex min-h-0 w-full flex-1 justify-center">
          <PlayerCard
            :player="p"
            :score="board.scoresByPlayerId[p.id] ?? 0"
            @rename="board.renamePlayer"
            @tapScore="openScore"
            @edit="goEditPlayer"
          />
        </div>
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

    <BottomSheet v-model="historyOpen" title="Lịch sử">
      <HistorySheet :history="board.history" :players="board.activePlayers" :cursor="board.cursorSeq" />
    </BottomSheet>

    <BottomSheet v-model="scoreOpen" title="Ghi điểm">
      <ScoreSheet
        :open="scoreOpen"
        :actor-player-id="actorPlayerId"
        :players="board.activePlayers"
        :scores-by-player-id="board.scoresByPlayerId"
        @confirmMulti="onConfirmMulti"
      />
    </BottomSheet>

    <div class="px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div class="grid grid-cols-4 gap-2 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-2 shadow-lg backdrop-blur">
        <button
          class="flex h-12 touch-manipulation flex-col items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98] disabled:opacity-40"
          :disabled="!canUndo"
          aria-label="Undo"
          @click="board.undo()"
        >
          <div class="text-base leading-none">↶</div>
          <div class="mt-0.5 text-[10px] font-semibold tracking-wide text-zinc-400">Undo</div>
        </button>
        <button
          class="flex h-12 touch-manipulation flex-col items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98] disabled:opacity-40"
          :disabled="!canRedo"
          aria-label="Redo"
          @click="board.redo()"
        >
          <div class="text-base leading-none">↷</div>
          <div class="mt-0.5 text-[10px] font-semibold tracking-wide text-zinc-400">Redo</div>
        </button>
        <button
          class="flex h-12 touch-manipulation flex-col items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98]"
          aria-label="History"
          @click="historyOpen = true"
        >
          <div class="text-base leading-none">⧉</div>
          <div class="mt-0.5 text-[10px] font-semibold tracking-wide text-zinc-400">History</div>
        </button>
        <button
          class="flex h-12 touch-manipulation flex-col items-center justify-center rounded-2xl bg-violet-500 text-zinc-950 active:bg-violet-400 active:scale-[0.98] disabled:opacity-40"
          :disabled="!canAdd"
          aria-label="Add player"
          @click="board.addPlayer()"
        >
          <div class="text-base leading-none">+</div>
          <div class="mt-0.5 text-[10px] font-semibold tracking-wide text-zinc-950/70">Add</div>
        </button>
      </div>
    </div>
  </div>
</template>
