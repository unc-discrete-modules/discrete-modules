import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target:
          loadEnv(mode, process.cwd(), '').VITE_BACKEND_TARGET ||
          'http://localhost:8000',
        changeOrigin: true,
      },
      '/saml/acs': {
        target:
          loadEnv(mode, process.cwd(), '').VITE_BACKEND_TARGET ||
          'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
}))
