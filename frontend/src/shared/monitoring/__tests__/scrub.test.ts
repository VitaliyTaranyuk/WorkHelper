import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/react'
import { scrubBreadcrumb, scrubEvent, scrubText, scrubUrl, scrubValue } from '../scrub'

/**
 * ТП-175: PII-скрабинг — регресс приватностного дефолта. Событие мониторинга
 * не должно содержать email, имена, токены и пароли ни в одном из полей.
 */
describe('scrubText', () => {
  it('маскирует email в произвольном тексте', () => {
    expect(scrubText('User test2@mail.ru not found')).toBe('User [email] not found')
  })

  it('маскирует несколько email', () => {
    expect(scrubText('a@b.ru wrote to c.d+tag@e-f.co.uk')).toBe('[email] wrote to [email]')
  })

  it('не трогает текст без email', () => {
    expect(scrubText("Cannot read properties of undefined (reading 'id')")).toBe(
      "Cannot read properties of undefined (reading 'id')",
    )
  })
})

describe('scrubUrl', () => {
  it('маскирует JWT в query WS-хендшейка Meet', () => {
    expect(scrubUrl('wss://host/work-task/ws/meet?room=abc&token=eyJhbGciOi.payload.sig')).toBe(
      'wss://host/work-task/ws/meet?room=abc&token=[filtered]',
    )
  })

  it('маскирует access_token и key, сохраняя остальные параметры', () => {
    expect(scrubUrl('https://h/p?access_token=SECRET&page=2&key=K1')).toBe(
      'https://h/p?access_token=[filtered]&page=2&key=[filtered]',
    )
  })

  it('не меняет URL без чувствительных параметров', () => {
    expect(scrubUrl('https://h/work-task/api/v1/tasks?page=2')).toBe(
      'https://h/work-task/api/v1/tasks?page=2',
    )
  })
})

describe('scrubValue', () => {
  it('маскирует чувствительные ключи на любой глубине', () => {
    const scrubbed = scrubValue({
      data: { password: 'p', nested: { accessToken: 't', Authorization: 'Bearer x' } },
      count: 5,
    }) as Record<string, unknown>
    expect(scrubbed).toEqual({
      data: {
        password: '[filtered]',
        nested: { accessToken: '[filtered]', Authorization: '[filtered]' },
      },
      count: 5,
    })
  })

  it('маскирует ключи идентичности пользователя (email/имена)', () => {
    expect(
      scrubValue({ email: 'a@b.ru', firstName: 'Иван', lastName: 'Иванов', username: 'ivanov' }),
    ).toEqual({
      email: '[filtered]',
      firstName: '[filtered]',
      lastName: '[filtered]',
      username: '[filtered]',
    })
  })

  it('чистит email внутри строковых значений обычных ключей', () => {
    expect(scrubValue({ note: 'contact a@b.ru' })).toEqual({ note: 'contact [email]' })
  })

  it('обрабатывает массивы и примитивы', () => {
    expect(scrubValue(['a@b.ru', 42, null])).toEqual(['[email]', 42, null])
  })
})

describe('scrubEvent', () => {
  it('оставляет от user только id', () => {
    const event = {
      user: { id: 'uuid-1', email: 'a@b.ru', username: 'ivanov', ip_address: '1.2.3.4' },
    } as unknown as ErrorEvent
    expect(scrubEvent(event).user).toEqual({ id: 'uuid-1' })
  })

  it('фильтрует заголовки запроса и query-токены, удаляет тело', () => {
    const event = {
      request: {
        url: 'https://h/api?token=SECRET',
        headers: { Authorization: 'Bearer x', Accept: 'application/json' },
        data: { password: 'p' },
      },
    } as unknown as ErrorEvent
    const scrubbed = scrubEvent(event)
    expect(scrubbed.request).toEqual({
      url: 'https://h/api?token=[filtered]',
      headers: { Authorization: '[filtered]', Accept: 'application/json' },
    })
  })

  it('чистит сообщение исключения и breadcrumb-данные', () => {
    const event = {
      exception: { values: [{ value: 'fail for a@b.ru at ?token=X' }] },
      breadcrumbs: [
        { message: 'fetch a@b.ru', data: { url: 'https://h?token=S', method: 'GET' } },
      ],
    } as unknown as ErrorEvent
    const scrubbed = scrubEvent(event)
    expect(scrubbed.exception?.values?.[0].value).toBe('fail for [email] at ?token=[filtered]')
    expect(scrubbed.breadcrumbs?.[0]).toEqual({
      message: 'fetch [email]',
      data: { url: 'https://h?token=[filtered]', method: 'GET' },
    })
  })
})

describe('scrubBreadcrumb', () => {
  it('чистит консольную крошку с email', () => {
    expect(scrubBreadcrumb({ message: 'login failed for a@b.ru' })).toEqual({
      message: 'login failed for [email]',
    })
  })
})
