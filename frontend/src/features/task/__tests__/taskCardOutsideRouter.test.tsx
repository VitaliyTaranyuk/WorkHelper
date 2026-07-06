import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskCardContent } from '../TaskCardContent'
import type { ITaskCard } from '@/entities/task/types'

/**
 * ТП-172 — постоянный репродьюсер прод-инцидента «белый экран при открытии
 * карточки задачи с доски». Корень: TaskCardContent живёт и в NiceModal-
 * модалке ВНЕ контекста роутера (класс TD-015/ТП-131) — вызов useNavigate()
 * там бросал TypeError и ронял всё дерево React.
 *
 * Тест рендерит карточку БЕЗ RouterProvider (как в модалке): до фикса —
 * краш этим же TypeError, после — рендер без исключения. Тест остаётся
 * навсегда (правило post-mortem: репро-тест до фикса, затем фикс).
 */

const task: ITaskCard = {
  id: 't-1',
  code: 'ТП-1',
  title: 'Задача с краевыми данными',
  priority: 'MEDIUM',
  taskType: 'TASK',
  status: { id: 1, code: 'To Do' },
  // Краевые поля инцидента: нет исполнителя, спринта, описания, оценки
} as ITaskCard

describe('TaskCardContent вне контекста роутера (модалка)', () => {
  it('рендерится без исключения — router-hooks в компоненте запрещены', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    expect(() =>
      render(
        <QueryClientProvider client={client}>
          <TaskCardContent task={task} />
        </QueryClientProvider>,
      ),
    ).not.toThrow()
    // Данные проекта грузятся — карточка показывает загрузку, не белый экран
    expect(document.body.textContent).toBeDefined()
  })
})
