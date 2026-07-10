<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const open = computed(() => props.modelValue)
const closeButtonEl = ref<HTMLButtonElement | null>(null)
const restoreFocusEl = ref<HTMLElement | null>(null)

function lockBodyScroll() {
  const count = Number(document.body.dataset.sheetLocks ?? '0')
  if (count === 0) document.body.dataset.sheetPrevOverflow = document.body.style.overflow
  document.body.dataset.sheetLocks = String(count + 1)
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll() {
  const count = Number(document.body.dataset.sheetLocks ?? '0')
  const next = Math.max(0, count - 1)
  document.body.dataset.sheetLocks = String(next)
  if (next === 0) {
    document.body.style.overflow = document.body.dataset.sheetPrevOverflow ?? ''
    delete document.body.dataset.sheetPrevOverflow
  }
}

function close() {
  emit('update:modelValue', false)
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

watch(
  open,
  async (v) => {
    if (typeof window === 'undefined') return
    if (v) {
      restoreFocusEl.value = (document.activeElement as HTMLElement | null) ?? null
      lockBodyScroll()
      await nextTick()
      closeButtonEl.value?.focus()
      return
    }
    unlockBodyScroll()
    restoreFocusEl.value?.focus?.()
    restoreFocusEl.value = null
  },
  { flush: 'post' },
)
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 bg-black/60" aria-hidden="true" @click="close" />
    </Transition>

    <!-- Side Sheet Panel -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-250 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="open"
        class="fixed right-0 top-0 bottom-0 z-50 h-full w-[85%] max-w-sm border-l border-zinc-800/80 bg-zinc-900/95 shadow-2xl backdrop-blur-xl transform-gpu will-change-transform flex flex-col"
        role="dialog"
        aria-modal="true"
        :aria-label="title ?? 'Side Sheet'"
        tabindex="-1"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 pb-3 pt-5 border-b border-zinc-800/50">
          <div class="text-xs font-black tracking-widest uppercase text-zinc-500">{{ title }}</div>
          <button
            ref="closeButtonEl"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-950/45 text-zinc-400 active:bg-zinc-800 active:text-zinc-200 active:scale-[0.96] transition-all"
            @click="close"
          >
            <span class="text-lg leading-none">&times;</span>
          </button>
        </div>
        
        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-4 py-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
