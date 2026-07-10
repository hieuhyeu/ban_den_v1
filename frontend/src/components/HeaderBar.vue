<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    canUndo: boolean
    canRedo: boolean
    showUndo?: boolean
    showRedo?: boolean
    showHistory?: boolean
    showAdd?: boolean
    leftKind?: 'menu' | 'back'
  }>(),
  {
    showUndo: true,
    showRedo: true,
    showHistory: true,
    showAdd: true,
    leftKind: 'menu',
  },
)

const emit = defineEmits<{
  (e: 'menu'): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'history'): void
  (e: 'add'): void
}>()
</script>

<template>
  <div class="sticky top-0 z-10 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur pt-safe">
    <div class="mx-auto flex h-14 w-full max-w-[430px] items-center gap-2 px-3.5">
      <button
        class="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800/40 text-zinc-300 active:bg-zinc-800 active:scale-[0.97] transition-all"
        :aria-label="leftKind === 'back' ? 'Back' : 'Menu'"
        @click="emit('menu')"
      >
        <!-- Menu Icon -->
        <svg v-if="leftKind === 'menu'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        <!-- Back Icon -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      </button>

      <div class="min-w-0 flex-1 px-1">
        <div class="truncate text-sm font-bold tracking-tight text-zinc-100 uppercase">{{ title }}</div>
      </div>

      <button
        v-if="showUndo"
        class="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800/40 text-zinc-300 active:bg-zinc-800 active:scale-[0.97] transition-all disabled:opacity-30 disabled:pointer-events-none"
        :disabled="!canUndo"
        aria-label="Undo"
        @click="emit('undo')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
      </button>
      <button
        v-if="showRedo"
        class="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800/40 text-zinc-300 active:bg-zinc-800 active:scale-[0.97] transition-all disabled:opacity-30 disabled:pointer-events-none"
        :disabled="!canRedo"
        aria-label="Redo"
        @click="emit('redo')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>
      </button>
      <button
        v-if="showHistory"
        class="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800/40 text-zinc-300 active:bg-zinc-800 active:scale-[0.97] transition-all"
        aria-label="History"
        @click="emit('history')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
      </button>
      <button
        v-if="showAdd"
        class="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl border border-emerald-800/30 bg-emerald-950/20 text-emerald-400 hover:text-emerald-300 active:bg-emerald-900/30 active:scale-[0.97] transition-all disabled:opacity-30 disabled:pointer-events-none"
        aria-label="Add player"
        @click="emit('add')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>
  </div>
</template>
