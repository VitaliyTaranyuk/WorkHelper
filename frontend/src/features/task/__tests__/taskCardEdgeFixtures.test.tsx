import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NiceModal from '@ebay/nice-modal-react'

// Герметичность: HTTP-клиент отвечает вечным pending — карточка живёт в
// loading-состоянии данных проекта, сеть из тестов не ходит (как в smoke T2).
vi.mock('@/shared/api/workTechHttpClient', () => ({
  workTechApiClient: Object.assign(
    vi.fn(() => new Promise(() => undefined)),
    { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  ),
  buildApiUrl: (endpoint: string) => endpoint,
  addWorkTechApiValidationMiddleware: () => undefined,
}))

import { TaskCardContent } from '../TaskCardContent'
import type { ITaskCard } from '@/entities/task/types'

/**
 * ТП-172 (T3): краевые фикстуры карточки задачи. Инцидент «белый экран»
 * показал: карточка обязана открываться на ЛЮБЫХ данных — параметризованный
 * рендер по набору краевых случаев (без исполнителя, без спринта, пустое и
 * огромное описание, отсутствующие опциональные поля, «битые» значения).
 * Рендер идёт в модальном контексте (без RouterProvider — как NiceModal),
 * гейт T4 дополнительно валит тест при console.error.
 */

const base: ITaskCard = {
  id: 't-1',
  code: 'ТП-1',
  title: 'Базовая задача',
  priority: 'MEDIUM',
  taskType: 'TASK',
  status: { id: 1, code: 'To Do' },
} as ITaskCard

const HUGE = 'Очень длинное описание. '.repeat(400) // ~9.6k символов

const fixtures: Array<{ name: string; task: ITaskCard }> = [
  {
    name: 'без исполнителя',
    task: { ...base, assignee: undefined } as unknown as ITaskCard,
  },
  {
    name: 'без спринта',
    task: { ...base, sprintId: undefined } as unknown as ITaskCard,
  },
  { name: 'пустое описание', task: { ...base, description: '' } },
  { name: 'огромное описание', task: { ...base, description: HUGE } },
  {
    name: 'без опциональных полей (estimation/updatedAt/creator)',
    task: {
      ...base,
      estimation: undefined,
      updatedAt: undefined,
      createdAt: undefined,
      creator: undefined,
    } as unknown as ITaskCard,
  },
  {
    name: 'битый приоритет и тип (дрейф API)',
    task: {
      ...base,
      priority: 'UNKNOWN' as never,
      taskType: 'STRANGE' as never,
    },
  },
  {
    name: 'бага с кириллическим кодом и вопросом в названии',
    task: {
      ...base,
      taskType: 'BUG',
      code: 'ТП-9999',
      title: 'Почему падает сборка? — краевой заголовок с символами «»/\\',
    } as ITaskCard,
  },
]

function renderCard(task: ITaskCard) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <NiceModal.Provider>
        <TaskCardContent task={task} />
      </NiceModal.Provider>
    </QueryClientProvider>,
  )
}

describe('TaskCardContent — краевые данные (ТП-172 T3)', () => {
  for (const { name, task } of fixtures) {
    it(`открывается: ${name}`, () => {
      expect(() => renderCard(task)).not.toThrow()
    })
  }
})
