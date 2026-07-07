import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'
import { captureMonitoredError, initMonitoring, setMonitoringUser } from '../init'
import { scrubBreadcrumb, scrubEvent } from '../scrub'

/**
 * ТП-175: интеграционная проверка «staging тем же механизмом» — реальный
 * SDK-пайплайн (init → captureException → beforeSend → transport) с
 * транспортом-ловушкой. Доказывает: событие формируется, релиз/область
 * проставлены, PII в исходящем envelope отсутствует.
 */
describe('initMonitoring (интеграция SDK)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('без DSN SDK не инициализируется', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    expect(initMonitoring()).toBe(false)
  })

  it('событие уходит в transport со скрабом PII, релизом и областью', async () => {
    const sent: string[] = []
    Sentry.init({
      dsn: 'https://public@monitoring.local/1',
      release: __APP_RELEASE__,
      sendDefaultPii: false,
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
      transport: (options) =>
        Sentry.createTransport(options, async (request) => {
          sent.push(String(request.body))
          return { statusCode: 200 }
        }),
    })

    setMonitoringUser('uuid-42')
    Sentry.addBreadcrumb({
      message: 'login for test2@mail.ru',
      data: { url: 'https://h/ws?token=SECRET-JWT' },
    })
    captureMonitoredError(new Error('boom for test2@mail.ru'), {
      area: 'карточку задачи',
      componentStack: 'at TaskCard',
    })
    await Sentry.flush(2000)
    await Sentry.close(2000)

    const envelope = sent.join('\n')
    expect(envelope).toContain('boom for [email]')
    expect(envelope).not.toContain('test2@mail.ru')
    expect(envelope).not.toContain('SECRET-JWT')
    expect(envelope).toContain('"id":"uuid-42"')
    expect(envelope).toContain('"area":"карточку задачи"')
    expect(envelope).toContain('"release":"dev"')
  })
})
