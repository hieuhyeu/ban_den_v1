<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
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
const scoreOpen = ref(false)
const actorPlayerId = ref<string | null>(null)

const canUndo = computed(() => board.cursorSeq > 0)
const canRedo = computed(() => board.canRedo)
const canAdd = computed(() => board.canAddPlayer)

const playersSorted = computed(() => board.activePlayers.slice().sort((a, b) => a.sortOrder - b.sortOrder))

const currentActor = computed(() => {
  const id = actorPlayerId.value
  if (!id) return null
  return board.activePlayers.find(p => p.id === id) ?? null
})

const scoreSheetTitle = computed(() => {
  return currentActor.value ? `Ghi điểm cho ${currentActor.value.name.toUpperCase()}` : 'Ghi điểm'
})

const currentActorColorHex = computed(() => {
  if (!currentActor.value) return undefined
  const key = currentActor.value.colorKey
  const options = [
    { key: 'violet', hex: '#A855F7' },
    { key: 'indigo', hex: '#818CF8' },
    { key: 'cyan', hex: '#22D3EE' },
    { key: 'teal', hex: '#2DD4BF' },
    { key: 'lime', hex: '#A3E635' },
    { key: 'yellow', hex: '#FDE047' },
    { key: 'orange', hex: '#FB923C' },
    { key: 'rose', hex: '#FB7185' },
  ]
  return options.find(o => o.key === key)?.hex
})

if (!board.board) board.hydrateFromCache()
if (!board.board) void board.refresh()

const initialLoading = computed(() => !board.board && board.loading)

const activeDoubleSelected = ref<Ball[]>([])
const historyContainerRef = ref<HTMLElement | null>(null)

watch(
  () => board.history.length,
  () => {
    nextTick(() => {
      if (historyContainerRef.value) {
        historyContainerRef.value.scrollTop = 0
      }
    })
  },
  { immediate: true }
)

function openScore(playerId: string) {
  actorPlayerId.value = playerId
  activeDoubleSelected.value = []
  scoreOpen.value = true
}

function onSelectionChange(payload: { canAnLang: boolean; doubleSelected: Ball[] }) {
  activeDoubleSelected.value = payload.doubleSelected
}

function onConfirmAnLang() {
  if (!actorPlayerId.value || !activeDoubleSelected.value.length) return
  const actorId = actorPlayerId.value
  const targetIds = board.activePlayers.filter((p) => p.id !== actorId).map((p) => p.id)
  const balls = activeDoubleSelected.value
  void board.applyAnLang(actorId, targetIds, balls)
  scoreOpen.value = false
}

function onConfirmMulti(actorId: string, targetId: string, balls: Array<3 | 6 | 9>) {
  void board.applyMultiBalls(actorId, targetId, balls)
  scoreOpen.value = false
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

function goEditPlayer(playerId: string) {
  router.push({ name: 'playerEdit', params: { id: playerId } })
}
</script>

<template>
  <div class="mx-auto flex h-[100svh] w-full max-w-[430px] flex-col overflow-hidden bg-[#050807] bg-grain relative">
    <HeaderBar
      title="Bắn Đền"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :show-undo="false"
      :show-redo="false"
      :show-history="false"
      :show-add="canAdd"
      @menu="menuOpen = true"
      @add="board.addPlayer()"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-h-0 px-4 pt-4 pb-24">
      <div v-if="initialLoading" class="flex flex-1 items-center justify-center">
        <div class="w-full rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 text-center backdrop-blur-sm">
          <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-300" />
          <div class="mt-4 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Đang tải dữ liệu...</div>
        </div>
      </div>

      <div v-else-if="playersSorted.length === 0" class="flex flex-1 items-center justify-center">
        <div class="w-full rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6 text-center backdrop-blur-sm">
          <div class="text-sm font-bold text-zinc-400">Chưa có người chơi nào</div>
          <button
            class="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-100 text-xs font-black tracking-widest text-zinc-950 uppercase hover:bg-white active:scale-[0.98] transition-all"
            @click="board.addPlayer()"
          >
            + THÊM NGƯỜI CHƠI
          </button>
        </div>
      </div>

      <template v-else>
        <!-- Permanent Scoreboard List (List Layout - Fixed Height to prevent layout shift) -->
        <div class="h-[280px] flex-shrink-0 overflow-hidden">
          <div class="flex flex-col gap-2">
            <div v-for="p in playersSorted" :key="p.id" class="h-16">
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

        <!-- Permanent Inline History Log (Scrollable to see full history) -->
        <div class="mt-4 flex-shrink-0 flex flex-col border-t border-zinc-900/60 pt-3">
          <div class="flex items-center justify-between mb-2 flex-shrink-0">
            <span class="text-[9px] font-black tracking-widest text-zinc-500 uppercase">LỊCH SỬ</span>
          </div>
          <div 
            ref="historyContainerRef"
            class="overflow-y-auto scrollbar-none h-[212px]"
          >
            <HistorySheet :history="board.history" :players="board.activePlayers" :cursor="board.cursorSeq" />
          </div>
        </div>
      </template>
    </div>

    <!-- Dock Menu at Bottom (Safe Area integrated) -->
    <div class="absolute bottom-0 inset-x-0 z-40 w-full bg-zinc-950/80 border-t border-zinc-900 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 px-4 backdrop-blur-lg">
      <div class="grid grid-cols-3 gap-2.5 max-w-[430px] mx-auto">
        <button
          class="flex h-11 touch-manipulation flex-col items-center justify-center rounded-xl bg-zinc-900/40 text-zinc-400 border border-zinc-900 hover:text-zinc-200 active:bg-zinc-850 active:scale-[0.96] transition-all disabled:opacity-20"
          :disabled="!canUndo"
          aria-label="Undo"
          @click="board.undo()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
          <div class="mt-0.5 text-[8px] font-black tracking-widest text-zinc-500 uppercase">Undo</div>
        </button>
        
        <button
          class="flex h-11 touch-manipulation flex-col items-center justify-center rounded-xl bg-zinc-900/40 text-zinc-400 border border-zinc-900 hover:text-zinc-200 active:bg-zinc-850 active:scale-[0.96] transition-all disabled:opacity-20"
          :disabled="!canRedo"
          aria-label="Redo"
          @click="board.redo()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>
          <div class="mt-0.5 text-[8px] font-black tracking-widest text-zinc-500 uppercase">Redo</div>
        </button>
        
        <!-- Temporarily Disabled History Button (Reserved for future features) -->
        <button
          class="flex h-11 touch-manipulation flex-col items-center justify-center rounded-xl bg-zinc-950/20 text-zinc-650 border border-zinc-900/40 opacity-30 cursor-not-allowed select-none"
          disabled
          aria-label="History"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <div class="mt-0.5 text-[8px] font-black tracking-widest uppercase text-zinc-600">Lịch sử</div>
        </button>
      </div>
    </div>

    <!-- Sheets -->
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

    <!-- Score sheet is limited in height to keep players visible above it -->
    <BottomSheet 
      v-model="scoreOpen" 
      :title="scoreSheetTitle" 
      :title-color="currentActorColorHex"
      :show-close="false"
      sheet-class="max-h-[46svh]"
    >
      <ScoreSheet
        :open="scoreOpen"
        :actor-player-id="actorPlayerId"
        :players="board.activePlayers"
        :scores-by-player-id="board.scoresByPlayerId"
        @confirmMulti="onConfirmMulti"
        @confirmAnLang="onConfirmAnLang"
        @selectionChange="onSelectionChange"
      />
    </BottomSheet>
  </div>
</template>
