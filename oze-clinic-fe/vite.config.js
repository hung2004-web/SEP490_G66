import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],

  resolve: {
    alias: {
      // ESM config: __dirname does not exist here, so the path is resolved from import.meta.url.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})