import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NiceModal from '@ebay/nice-modal-react'
import type { ITaskCard } from '@/entities/task/types'

/**
 * ТП-201 (КРИТИЧНО) — постоянный репродьюсер инцидента «пустое/потерянное
 * описание в карточке». Корень (регрессия ТП-187): объект задачи с доски —
 * СПИСКОВЫЙ, без тела описания; карточка сеяла из него форму → описание
 * пустое, правки шли поверх невидимого текста. Барьер: карточка обязана
 * монтировать содержимое ТОЛЬКО на ПОЛНОЙ задаче (с описанием), никогда на
 * списковом стабе / placeholder.
 */

const byCodeState = {
  data: undefined as ITaskCard | undefined,
  isPlaceholderData: false,
  isError: false,
  error: null as unknown,
  refetch: vi.fn(),
}

vi.mock('@/features/task/query/useTaskByCode', () => ({
  useTaskByCode: () => byCodeState,
}))
vi.mock('@/features/project/query/useProjectData', () => ({
  useProjectData: () => ({ activeProject: { id: 'p1' } }),
}))
// TaskCardContent подменяем шпионом: показываем, какое описание получила форма.
vi.mock('@/features/task/TaskCardContent', () => ({
  TaskCardContent: ({ task }: { task: ITaskCard & { description?: string } }) => (
    <div data-testid="card-content">desc:{task.description ?? ''}</div>
  ),
}))

import { TaskCardModal } from '../TaskCardModal'

const stub: ITaskCard & { description?: string } = {
  id: 't-1',
  code: 'ТП-1',
  title: 'Задача',
  priority: 'MEDIUM',
  taskType: 'TASK',
  status: { id: 1, code: 'To Do' },
  description: '', // списковый стаб — тела описания нет (ТП-187)
} as ITaskCard & { description?: string }

const full = { ...stub, description: 'Полное описание задачи' }

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <NiceModal.Provider>
        <Shower />
      </NiceModal.Provider>
    </QueryClientProvider>,
  )
}
function Shower() {
  // открываем карточку С ДОСКИ — передан списковый объект (стаб без описания)
  useEffect(() => {
    void NiceModal.show(TaskCardModal, { task: stub }).catch(() => undefined)
  }, [])
  return null
}

describe('ТП-201: карточка не сеет форму из спискового стаба', () => {
  afterEach(() => {
    byCodeState.data = undefined
    byCodeState.isPlaceholderData = false
    byCodeState.isError = false
  })

  it('пока пришёл только placeholder (стаб без описания) — контент не монтируется', async () => {
    byCodeState.data = stub
    byCodeState.isPlaceholderData = true
    renderModal()
    // содержимое карточки НЕ должно рендериться на стабе — только скелетон
    await waitFor(() =>
      expect(screen.queryByTestId('card-content')).not.toBeInTheDocument(),
    )
  })

  it('когда пришла ПОЛНАЯ задача — форма получает реальное описание', async () => {
    byCodeState.data = full
    byCodeState.isPlaceholderData = false
    renderModal()
    await waitFor(() =>
      expect(screen.getByTestId('card-content')).toHaveTextContent(
        'desc:Полное описание задачи',
      ),
    )
  })
})
