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
        class="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl transform-gpu will-change-transform"
        role="dialog"
        aria-modal="true"
        :aria-label="title ?? 'Sheet'"
        tabindex="-1"
        @click.stop
      >
        <div class="flex items-center justify-between px-5 pb-3 pt-3">
          <div class="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-zinc-700/70" />
          <div class="text-sm font-semibold text-zinc-200">{{ title }}</div>
          <button
            ref="closeButtonEl"
            class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-200 active:bg-zinc-800 active:scale-[0.98]"
            @click="close"
          >
            <span class="text-lg leading-none">×</span>
          </button>
        </div>
        <div class="max-h-[75svh] overflow-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
