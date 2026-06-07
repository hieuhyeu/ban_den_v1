<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
  scroll?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const open = computed(() => props.modelValue)
const scroll = computed(() => props.scroll ?? true)
const closeButtonEl = ref<HTMLButtonElement | null>(null)
const restoreFocusEl = ref<HTMLElement | null>(null)

function lockBodyScroll() {
  if (typeof window === 'undefined') return
  const count = Number(document.body.dataset.sheetLocks ?? '0')
  if (count === 0) {
    document.body.dataset.sheetPrevOverflow = document.body.style.overflow
    document.body.dataset.sheetPrevPosition = document.body.style.position
    document.body.dataset.sheetPrevTop = document.body.style.top
    document.body.dataset.sheetPrevLeft = document.body.style.left
    document.body.dataset.sheetPrevRight = document.body.style.right
    document.body.dataset.sheetPrevWidth = document.body.style.width
    document.body.dataset.sheetScrollY = String(window.scrollY)
    document.body.style.position = 'fixed'
    document.body.style.top = `-${window.scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
  }
  document.body.dataset.sheetLocks = String(count + 1)
}

function unlockBodyScroll() {
  if (typeof window === 'undefined') return
  const count = Number(document.body.dataset.sheetLocks ?? '0')
  const next = Math.max(0, count - 1)
  document.body.dataset.sheetLocks = String(next)
  if (next === 0) {
    const y = Number(document.body.dataset.sheetScrollY ?? '0')
    document.body.style.overflow = document.body.dataset.sheetPrevOverflow ?? ''
    document.body.style.position = document.body.dataset.sheetPrevPosition ?? ''
    document.body.style.top = document.body.dataset.sheetPrevTop ?? ''
    document.body.style.left = document.body.dataset.sheetPrevLeft ?? ''
    document.body.style.right = document.body.dataset.sheetPrevRight ?? ''
    document.body.style.width = document.body.dataset.sheetPrevWidth ?? ''
    delete document.body.dataset.sheetPrevOverflow
    delete document.body.dataset.sheetPrevPosition
    delete document.body.dataset.sheetPrevTop
    delete document.body.dataset.sheetPrevLeft
    delete document.body.dataset.sheetPrevRight
    delete document.body.dataset.sheetPrevWidth
    delete document.body.dataset.sheetScrollY
    window.scrollTo(0, y)
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
        class="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md flex-col rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl transform-gpu will-change-transform"
        :class="scroll ? 'h-[85svh]' : 'max-h-[85svh]'"
        role="dialog"
        aria-modal="true"
        :aria-label="title ?? 'Sheet'"
        tabindex="-1"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-zinc-800 px-5 pb-3 pt-3">
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
        <div
          class="min-h-0 flex-1 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[5px]"
          :class="scroll ? 'overflow-auto overscroll-contain touch-pan-y' : 'overflow-hidden'"
          style="-webkit-overflow-scrolling: touch"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
