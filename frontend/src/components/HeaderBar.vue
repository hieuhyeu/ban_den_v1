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
  <div class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
    <div class="mx-auto flex h-14 w-full max-w-md items-center gap-2 px-3">
      <button
        class="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98]"
        :aria-label="leftKind === 'back' ? 'Back' : 'Menu'"
        @click="emit('menu')"
      >
        <span class="text-lg leading-none">{{ leftKind === 'back' ? '←' : '≡' }}</span>
      </button>

      <div class="min-w-0 flex-1 px-1">
        <div class="truncate text-sm font-semibold tracking-tight text-zinc-100">{{ title }}</div>
      </div>

      <button
        v-if="showUndo"
        class="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98] disabled:opacity-40"
        :disabled="!canUndo"
        aria-label="Undo"
        @click="emit('undo')"
      >
        ↶
      </button>
      <button
        v-if="showRedo"
        class="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98] disabled:opacity-40"
        :disabled="!canRedo"
        aria-label="Redo"
        @click="emit('redo')"
      >
        ↷
      </button>
      <button
        v-if="showHistory"
        class="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98]"
        aria-label="History"
        @click="emit('history')"
      >
        ⧉
      </button>
      <button
        v-if="showAdd"
        class="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl bg-violet-500 text-zinc-950 active:bg-violet-400 active:scale-[0.98] disabled:opacity-40"
        aria-label="Add player"
        @click="emit('add')"
      >
        +
      </button>
    </div>
  </div>
</template>
