import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/maa-prompt-generator/', // Replace with your repository name if different
  plugins: [vue()],
})
