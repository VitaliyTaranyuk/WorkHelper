// Глобальная настройка Vitest: матчеры jest-dom (toBeInTheDocument и т.п.)
// и очистка DOM между тестами. Подключается через vite.config.ts → test.setupFiles.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
