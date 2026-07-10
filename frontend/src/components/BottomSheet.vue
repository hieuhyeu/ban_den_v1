<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    sheetClass?: string
    showClose?: boolean
    titleColor?: string
  }>(),
  {
    showClose: true,
  }
)

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
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 bg-black/60" aria-hidden="true" @click="close" />
    </Transition>

    <Transition
      enter-active-class="transition-[transform,opacity] duration-250 ease-out"
      enter-from-class="translate-y-8 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-[transform,opacity] duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-8 opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] rounded-t-[28px] border-t border-x border-zinc-900 bg-zinc-950/95 shadow-2xl backdrop-blur-xl transform-gpu will-change-transform flex flex-col"
        :class="sheetClass"
        role="dialog"
        aria-modal="true"
        :aria-label="title ?? 'Sheet'"
        tabindex="-1"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 pb-2.5 pt-5 flex-shrink-0 relative">
          <!-- iOS-style Drag Handle -->
          <div class="pointer-events-none absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-zinc-800" />
          
          <div class="flex items-center gap-2">
            <span 
              v-if="titleColor"
              class="h-2.5 w-2.5 rounded-full animate-pulse" 
              :style="{ backgroundColor: titleColor }"
            />
            <div class="text-[10px] font-black tracking-widest uppercase text-zinc-100">{{ title }}</div>
          </div>
          
          <button
            v-if="showClose"
            ref="closeButtonEl"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 active:bg-zinc-800 active:text-zinc-200 active:scale-[0.96] transition-all"
            @click="close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <!-- Content Area -->
        <div class="max-h-[75svh] overflow-y-auto px-5 pb-[calc(1.2rem+env(safe-area-inset-bottom))] scrollbar-none flex-1">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
