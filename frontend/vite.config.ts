/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'
import svgrPlugin from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  test: {
    // jsdom нужен хукам/компонентам; чистая логика (реестр/резолверы) от него не зависит
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // тесты лежат рядом с кодом в __tests__/*.test.ts(x)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    svgrPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    // PORT задаёт тулинг (preview/CI), чтобы не конфликтовать с другим дев-сервером
    port: Number(process.env.PORT) || 3000,
  },
})
