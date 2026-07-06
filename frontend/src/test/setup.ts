// Глобальная настройка Vitest: матчеры jest-dom (toBeInTheDocument и т.п.)
// и очистка DOM между тестами. Подключается через vite.config.ts → test.setupFiles.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

/**
 * ТП-172 (T4): гейт качества тест-раннера — незамеченные ошибки делают тест
 * красным БЕЗ явного assert:
 *  - console.error во время теста (React так репортит краши рендера,
 *    сработавшие error boundaries и нарушения правил хуков);
 *  - для uncaught exception / unhandled rejection Vitest красит тест сам.
 * Тесты, которые ПРОВЕРЯЮТ ошибочные сценарии, мокают console.error через
 * vi.spyOn(...).mockImplementation(...) — мок перехватывает вызов до гейта.
 */
const consoleErrors: unknown[][] = []
const originalConsoleError = console.error

beforeEach(() => {
  consoleErrors.length = 0
  // Если предыдущий тест замокал console.error и не восстановил — вернём гейт
  if (console.error === originalConsoleError || !('mock' in console.error))
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args)
      originalConsoleError(...args)
    }
})

afterEach(() => {
  cleanup()
  if (consoleErrors.length > 0) {
    const first = consoleErrors[0]!
    consoleErrors.length = 0
    throw new Error(
      `Тест оставил console.error (${first
        .map((a) => (a instanceof Error ? a.message : String(a)))
        .join(' ')
        .slice(0, 300)}). Краш рендера/error boundary не должен проходить молча (ТП-172 T4); ` +
        'если ошибка ожидаема тестом — vi.spyOn(console, "error").mockImplementation(() => {}).',
    )
  }
})
