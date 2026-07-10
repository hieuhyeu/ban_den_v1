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
const imgLoaded = ref(false)

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

const displayedScore = ref(props.score)
const oldScore = ref(props.score)
const changeValue = ref(0)
const animationActive = ref(false)
const deltaType = ref<'plus' | 'minus' | null>(null)
let animTimer: number | null = null

watch(
  () => props.score,
  (v, old) => {
    const delta = v - old
    if (!delta) {
      displayedScore.value = v
      oldScore.value = v
      return
    }
    bump.value = delta > 0 ? 'up' : 'down'
    if (bumpTimer) window.clearTimeout(bumpTimer)
    bumpTimer = window.setTimeout(() => {
      bump.value = null
    }, 240)

    // Set calculation state
    oldScore.value = old
    changeValue.value = Math.abs(delta)
    deltaType.value = delta > 0 ? 'plus' : 'minus'
    displayedScore.value = v
    animationActive.value = true

    if (animTimer) window.clearTimeout(animTimer)
    animTimer = window.setTimeout(() => {
      animationActive.value = false
    }, 2000)
  },
)

watch(
  () => props.player.avatarUrl,
  () => {
    imgLoaded.value = false
  }
)

onUnmounted(() => {
  if (bumpTimer) window.clearTimeout(bumpTimer)
  if (animTimer) window.clearTimeout(animTimer)
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
  <div 
    class="flex h-16 w-full items-center justify-between overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:border-zinc-700/60"
    :style="{ borderColor: selectedColor.hex + '4d', backgroundColor: selectedColor.hex + '24' }"
  >
    <!-- Left Section: Avatar, Name & Quick Edit -->
    <div class="flex flex-1 items-center gap-3 min-w-0 pl-3.5 pr-2">
      <!-- Squircle Avatar Container -->
      <div class="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/60" aria-hidden="true">
        <img 
          v-if="avatarUrl" 
          :src="avatarUrl" 
          alt="" 
          class="h-full w-full object-cover transition-opacity duration-200" 
          :class="imgLoaded ? 'opacity-100' : 'opacity-0'"
          @load="imgLoaded = true" 
        />
        <!-- Monogram Fallback -->
        <div 
          v-if="!avatarUrl || !imgLoaded" 
          class="absolute inset-0 flex items-center justify-center text-sm font-extrabold select-none transition-colors"
          :style="{ backgroundColor: selectedColor.hex + '33', color: '#ffffff' }"
        >
          {{ player.name.slice(0, 1).toUpperCase() }}
        </div>
      </div>
      
      <!-- Name Input -->
      <input
        v-model="draft"
        class="h-9 w-full min-w-0 appearance-none border-0 bg-transparent px-0 text-sm font-bold tracking-tight text-zinc-200 outline-none placeholder:text-zinc-650 focus:outline-none focus:ring-0 focus:text-white"
        placeholder="Tên người chơi"
        @keydown.enter.prevent="commitName"
        @keydown.esc.prevent="cancelName"
        @blur="commitName"
      />
      
      <!-- Edit Details Button -->
      <button
        class="inline-flex h-7 w-7 flex-shrink-0 touch-manipulation items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 active:bg-zinc-800 active:text-zinc-200 active:scale-[0.95] transition-all"
        aria-label="Chỉnh sửa người chơi"
        @click="emit('edit', player.id)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
      </button>
    </div>

    <!-- Right Section: Score Button (Call to Action) -->
    <button
      class="flex h-full flex-shrink-0 touch-manipulation items-center justify-end pr-10 border-l bg-zinc-950/20 active:bg-zinc-950/45 hover:bg-zinc-950/30 active:scale-[0.98] transition-all duration-500 ease-out"
      :style="{ borderLeftColor: selectedColor.hex + '4d' }"
      :class="animationActive ? 'w-[205px]' : 'w-24'"
      aria-label="Ghi điểm"
      @click="emit('tapScore', player.id)"
    >
      <div class="flex items-center gap-1 font-mono tracking-tight select-none justify-end w-full">
        <Transition
          enter-active-class="transition-all duration-500 ease-out"
          enter-from-class="opacity-0 -translate-x-4 scale-95"
          enter-to-class="opacity-100 translate-x-0 scale-100"
          leave-active-class="transition-all duration-350 ease-in"
          leave-from-class="opacity-100 translate-x-0 scale-100"
          leave-to-class="opacity-0 -translate-x-4 scale-95"
        >
          <div v-if="animationActive" class="flex items-center gap-1 text-2xl font-black whitespace-nowrap">
            <span class="text-zinc-400">{{ oldScore }}</span>
            <span :class="deltaType === 'plus' ? 'text-emerald-400' : 'text-rose-500'">
              {{ deltaType === 'plus' ? '+' : '-' }}
            </span>
            <span :class="deltaType === 'plus' ? 'text-emerald-400' : 'text-rose-500'">
              {{ changeValue }}
            </span>
            <span class="text-zinc-400">=</span>
          </div>
        </Transition>
        <div 
          class="text-2xl font-black tabular-nums transition-all duration-300 pl-1" 
          :style="{ color: selectedColor.hex }"
          :class="bumpClass"
        >
          {{ displayedScore }}
        </div>
      </div>
    </button>
  </div>
</template>

