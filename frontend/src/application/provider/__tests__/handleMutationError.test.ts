import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { handleMutationError } from '../QueryProvider'
import { notify } from '@/shared/ui/notify'

vi.mock('@/shared/ui/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

type MutationLike = Parameters<typeof handleMutationError>[1]

const mutation = (onError?: unknown): MutationLike =>
  ({ options: onError ? { onError } : {} }) as MutationLike

function axiosError(status: number, data?: unknown): AxiosError {
  const err = new AxiosError('request failed')
  err.response = {
    status,
    statusText: '',
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  }
  return err
}

describe('handleMutationError (TD-045)', () => {
  beforeEach(() => {
    vi.mocked(notify.error).mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('показывает сообщение backend, когда своей обработки у мутации нет', () => {
    handleMutationError(axiosError(409, { message: 'Спринт уже завершён' }), mutation())

    expect(notify.error).toHaveBeenCalledWith('Спринт уже завершён')
  })

  it('молчит, если у мутации есть свой onError — локальная обработка главнее', () => {
    // Без этого условия формы создания задачи получали бы generic-тост поверх
    // подсветки конкретных полей, и он скрывал бы реальную причину.
    handleMutationError(axiosError(400, { message: 'x' }), mutation(() => {}))

    expect(notify.error).not.toHaveBeenCalled()
  })

  it('молчит на 401 — сценарий ведёт apiMiddleware', () => {
    handleMutationError(axiosError(401), mutation())

    expect(notify.error).not.toHaveBeenCalled()
  })

  it('не выпускает наружу технические детали, если backend их не дал', () => {
    handleMutationError(new Error('TypeError: undefined is not a function'), mutation())

    expect(notify.error).toHaveBeenCalledWith(
      'Не удалось выполнить действие. Попробуйте ещё раз.',
    )
  })

  it('переводит 5xx в понятное сообщение, а не в код статуса', () => {
    handleMutationError(axiosError(500), mutation())

    expect(notify.error).toHaveBeenCalledWith(
      'Внутренняя ошибка сервера. Попробуйте позже.',
    )
  })
})
