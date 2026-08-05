import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * T-516: размер задачи и обязательные этапы.
 *
 * Проверяется не вёрстка, а свойства: обязательность приходит с сервера и не
 * пересчитывается на клиенте; проект без процесса не получает пустой блок в каждой
 * карточке (F-04); размер снимается повторным кликом — запрет снятия ввёл бы обязательное
 * поле с чёрного хода; сбой загрузки процесса не роняет карточку задачи (R-01).
 */

const getTaskProcess = vi.fn()
const setTaskSize = vi.fn()
const setTaskProcessStep = vi.fn()

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    taskProcess: {
      getTaskProcess: (a: unknown) => getTaskProcess(a),
      setTaskSize: (a: unknown) => setTaskSize(a),
      setTaskProcessStep: (a: unknown) => setTaskProcessStep(a),
    },
  },
}))

import { TaskProcessPanel } from '../TaskProcessPanel'

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const PROCESS = {
  taskId: 't1',
  size: 'S',
  currentStepId: 's2',
  steps: [
    {
      id: 's1',
      code: 'A0',
      name: 'Актуальность',
      description: null,
      position: 1,
      requiredFromSize: 'XS',
      required: true,
      current: false,
    },
    {
      id: 's2',
      code: 'A2',
      name: 'Контр-анализ',
      description: null,
      position: 2,
      requiredFromSize: 'M',
      required: false,
      current: true,
    },
  ],
}

describe('процесс задачи в карточке (T-516)', () => {
  let client: QueryClient

  beforeEach(() => {
    getTaskProcess.mockResolvedValue({ data: PROCESS })
    setTaskSize.mockResolvedValue({ data: PROCESS })
    setTaskProcessStep.mockResolvedValue({ data: PROCESS })
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    client.clear()
  })

  it('процесс запрашивается у проекта и задачи из пропсов', async () => {
    render(<TaskProcessPanel projectId="p1" taskId="t1" />, { wrapper: wrapper(client) })

    await waitFor(() =>
      expect(getTaskProcess).toHaveBeenCalledWith({ projectId: 'p1', taskId: 't1' }),
    )
  })

  /**
   * Обязательность считает сервер: клиент только отображает флаг `required`. Второе
   * вычисление правила «обязателен с размера X» разошлось бы с серверным.
   */
  it('обязательный этап отмечен, необязательный — нет', async () => {
    render(<TaskProcessPanel projectId="p1" taskId="t1" />, { wrapper: wrapper(client) })

    expect(await screen.findByText('A0 •')).toBeInTheDocument()
    expect(screen.getByText('A2')).toBeInTheDocument()
  })

  /** F-04: пустой блок «Процесс» в каждой карточке был бы шумом, а не информацией. */
  it('проект без процесса не показывает панель вовсе', async () => {
    getTaskProcess.mockResolvedValue({
      data: { taskId: 't1', size: null, currentStepId: null, steps: [] },
    })

    const { container } = render(<TaskProcessPanel projectId="p1" taskId="t1" />, {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(getTaskProcess).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  /** R-01: сбой одного блока не должен обваливать карточку задачи. */
  it('сбой загрузки процесса не роняет карточку', async () => {
    getTaskProcess.mockRejectedValue(new Error('network'))

    const { container } = render(<TaskProcessPanel projectId="p1" taskId="t1" />, {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('выбор размера уходит на сервер', async () => {
    render(<TaskProcessPanel projectId="p1" taskId="t1" />, { wrapper: wrapper(client) })

    fireEvent.click(await screen.findByRole('button', { name: 'L' }))

    await waitFor(() =>
      expect(setTaskSize).toHaveBeenCalledWith({
        projectId: 'p1',
        taskId: 't1',
        size: 'L',
      }),
    )
  })

  /** Снятие размера разрешено: запрет ввёл бы обязательное поле с чёрного хода. */
  it('повторный клик по выбранному размеру снимает его', async () => {
    render(<TaskProcessPanel projectId="p1" taskId="t1" />, { wrapper: wrapper(client) })

    fireEvent.click(await screen.findByRole('button', { name: 'S' }))

    await waitFor(() =>
      expect(setTaskSize).toHaveBeenCalledWith({
        projectId: 'p1',
        taskId: 't1',
        size: null,
      }),
    )
  })

  it('клик по этапу делает его текущим, а по текущему — снимает', async () => {
    render(<TaskProcessPanel projectId="p1" taskId="t1" />, { wrapper: wrapper(client) })

    fireEvent.click(await screen.findByText('A0 •'))
    await waitFor(() =>
      expect(setTaskProcessStep).toHaveBeenCalledWith({
        projectId: 'p1',
        taskId: 't1',
        stepId: 's1',
      }),
    )

    fireEvent.click(screen.getByText('A2'))
    await waitFor(() =>
      expect(setTaskProcessStep).toHaveBeenCalledWith({
        projectId: 'p1',
        taskId: 't1',
        stepId: null,
      }),
    )
  })

  it('задача без размера объясняет, что обязательных этапов нет', async () => {
    getTaskProcess.mockResolvedValue({
      data: {
        ...PROCESS,
        size: null,
        steps: PROCESS.steps.map((s) => ({ ...s, required: false })),
      },
    })

    render(<TaskProcessPanel projectId="p1" taskId="t1" />, { wrapper: wrapper(client) })

    expect(
      await screen.findByText(/не задан — обязательных этапов нет/),
    ).toBeInTheDocument()
  })
})
