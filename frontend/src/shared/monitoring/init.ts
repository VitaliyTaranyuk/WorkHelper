import * as Sentry from '@sentry/react'
import { scrubBreadcrumb, scrubEvent } from './scrub'

/**
 * Прод-мониторинг клиентских ошибок (ТП-175, T5 из post-mortem ТП-172).
 *
 * SDK — официальный `@sentry/react`: один и тот же протокол принимают
 * Sentry SaaS, self-hosted Sentry и GlitchTip, поэтому выбор backend —
 * это значение `VITE_SENTRY_DSN` на сборке, а не форк кода. Пустой DSN
 * (локальная разработка, тесты) — SDK не инициализируется, накладных
 * расходов нет.
 *
 * Что ловится автоматически (GlobalHandlers включены по умолчанию):
 * `window.onerror`, `window.onunhandledrejection`. Крахи React-деревьев
 * дошиваются вручную из двух граничных точек: `ErrorBoundary`
 * (модалки/блоки вне роутов) и `RouteErrorFallback` (крах рендера роута).
 *
 * PII не отправляется: см. `scrub.ts` (маскирование по умолчанию).
 */
export function initMonitoring(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return false

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: __APP_RELEASE__,
    sendDefaultPii: false,
    // Только ошибки: перформанс-трейсинг и Replay не включаем (объём/приватность).
    tracesSampleRate: 0,
    sampleRate: 1.0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  })
  return true
}

/**
 * Привязка пользователя к событиям — ТОЛЬКО внутренний UUID (не PII):
 * ошибки одного пользователя группируются, личность не раскрывается.
 */
export function setMonitoringUser(userId: string | null) {
  Sentry.setUser(userId ? { id: userId } : null)
}

/**
 * Ручная отправка пойманной ошибки (границы React). Безопасно звать всегда:
 * без инициализации SDK вызов — no-op.
 */
export function captureMonitoredError(
  error: unknown,
  context?: { area?: string; componentStack?: string | null },
) {
  Sentry.captureException(error, {
    tags: context?.area ? { area: context.area } : undefined,
    contexts: context?.componentStack
      ? { react: { componentStack: context.componentStack } }
      : undefined,
  })
}
