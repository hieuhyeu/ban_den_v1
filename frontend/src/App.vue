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
  <div class="min-h-[100svh] bg-zinc-950 text-zinc-100">
    <RouterView v-slot="{ Component, route: r }">
      <Transition :name="transitionName" mode="out-in">
        <component :is="Component" :key="r.fullPath" />
      </Transition>
    </RouterView>
  </div>
</template>
