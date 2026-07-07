/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'
import svgrPlugin from 'vite-plugin-svgr'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// ТП-175: релиз сборки — git SHA (передаёт деплой-пайплайн), локально 'dev'.
const appRelease = process.env.APP_RELEASE || 'dev'
// Заливка source maps в мониторинг (GlitchTip/Sentry — один протокол) идёт
// только на сборке деплоя, где заданы креды; локальная сборка — без карт.
const uploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_URL,
)

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
  define: {
    __APP_RELEASE__: JSON.stringify(appRelease),
  },
  build: {
    // ТП-175: 'hidden' — карты генерятся для заливки в мониторинг, но ссылка
    // sourceMappingURL в бандл не пишется; после заливки карты удаляются и в
    // публичную раздачу не попадают.
    sourcemap: uploadSourceMaps ? 'hidden' : false,
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    svgrPlugin(),
    ...(uploadSourceMaps
      ? [
          sentryVitePlugin({
            url: process.env.SENTRY_URL,
            org: process.env.SENTRY_ORG || 'worktask',
            project: process.env.SENTRY_PROJECT || 'work-task-frontend',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: appRelease },
            sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
            telemetry: false,
            // Недоступность мониторинга не должна ронять сборку деплоя:
            // без карт стеки хуже, но релиз важнее.
            errorHandler(err) {
              console.warn('[sentry-vite-plugin] upload warning:', err?.message)
            },
          }),
        ]
      : []),
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
