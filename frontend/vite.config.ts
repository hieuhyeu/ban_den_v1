import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase/supabase-js')) return 'supabase'
          if (id.includes('pinia')) return 'pinia'
          if (id.includes('vue-router')) return 'vue-router'
          if (id.includes('vue')) return 'vue'
          return 'vendor'
        },
      },
    },
  },
})
