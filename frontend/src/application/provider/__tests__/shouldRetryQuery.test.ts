import { describe, expect, it } from 'vitest'
import { shouldRetryQuery } from '../QueryProvider'

function axiosError(status: number) {
  return { response: { status } }
}

describe('shouldRetryQuery', () => {
  it('не ретраит клиентские ошибки 4xx (детерминированный ответ)', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetryQuery(0, axiosError(status))).toBe(false)
    }
  })

  it('ретраит серверные ошибки до 3 попыток', () => {
    expect(shouldRetryQuery(0, axiosError(500))).toBe(true)
    expect(shouldRetryQuery(2, axiosError(503))).toBe(true)
    expect(shouldRetryQuery(3, axiosError(500))).toBe(false)
  })

  it('ретраит сетевые сбои без HTTP-статуса', () => {
    expect(shouldRetryQuery(0, new Error('Network Error'))).toBe(true)
    expect(shouldRetryQuery(3, new Error('Network Error'))).toBe(false)
  })
})
