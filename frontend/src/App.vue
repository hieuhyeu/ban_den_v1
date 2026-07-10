<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const transitionName = computed(() => {
  const t = route.meta.transition
  return typeof t === 'string' && t.length ? t : 'fade'
})
</script>

<template>
  <div class="min-h-[100svh] bg-[#020302] text-zinc-100 flex justify-center">
    <div class="w-full max-w-[430px] min-h-[100svh] bg-[#050807] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col overflow-hidden">
      <RouterView v-slot="{ Component, route: r }">
        <Transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="r.fullPath" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>
