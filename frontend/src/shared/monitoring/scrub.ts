import type { Breadcrumb, ErrorEvent } from '@sentry/react'

/**
 * Скрабинг PII перед отправкой события в мониторинг (ТП-175).
 *
 * Приватностный дефолт (рекомендация Sentry): сырые персональные данные
 * (email, имена, токены, пароли) не покидают браузер — даже если endpoint
 * сменят на внешний SaaS, PII в отчёты не попадёт. Пользователь
 * идентифицируется только внутренним UUID (`user.id`) — этого достаточно,
 * чтобы связать ошибки одного пользователя, не раскрывая личность.
 * Ослабление политики — осознанное решение владельца (одна настройка здесь).
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g

/** Ключи, значения которых всегда маскируются (без учёта регистра). */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'email',
  'firstname',
  'lastname',
  'displayname',
  'username',
]

const FILTERED = '[filtered]'

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z]/g, '')
  return SENSITIVE_KEYS.some((s) => k === s || k.endsWith(s))
}

/** email-адреса в произвольном тексте → [email] (сообщения ошибок, значения). */
export function scrubText(text: string): string {
  return text.replace(EMAIL_RE, '[email]')
}

/**
 * Query-параметры с токенами в URL → значение маскируется. Актуально для
 * WS-сигналинга Meet: JWT передаётся в query хендшейка (`?token=…`) и
 * попадает в breadcrumb'ы fetch/xhr при логировании URL.
 */
export function scrubUrl(url: string): string {
  return url.replace(
    /([?&](?:token|access_token|refresh_token|jwt|key)=)[^&#\s]+/gi,
    `$1${FILTERED}`,
  )
}

/** Рекурсивный скраб объекта: чувствительные ключи и email в строках. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value
  if (typeof value === 'string') return scrubUrl(scrubText(value))
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? FILTERED : scrubValue(v, depth + 1)
    }
    return out
  }
  return value
}

/**
 * `beforeSend`: единая точка санитизации события.
 * - user → только id (UUID), никаких email/имён/ip;
 * - заголовки Authorization/Cookie и чувствительные ключи → [filtered];
 * - email в сообщениях/значениях → [email], токены в URL → [filtered].
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.user) event.user = { id: event.user.id }
  delete event.server_name

  if (event.request) {
    if (event.request.headers)
      event.request.headers = scrubValue(event.request.headers) as Record<
        string,
        string
      >
    if (event.request.url) event.request.url = scrubUrl(event.request.url)
    // Тела запросов в отчёты не отправляем вовсе: формы содержат PII.
    delete event.request.data
  }

  if (event.message) event.message = scrubText(event.message)
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubUrl(scrubText(exception.value))
  }

  if (event.extra) event.extra = scrubValue(event.extra) as typeof event.extra
  if (event.contexts)
    event.contexts = scrubValue(event.contexts) as typeof event.contexts
  if (event.tags) event.tags = scrubValue(event.tags) as typeof event.tags

  if (event.breadcrumbs)
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb)

  return event
}

/** Скраб отдельной хлебной крошки (URL fetch/xhr, консольные сообщения). */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message)
  if (breadcrumb.data)
    breadcrumb.data = scrubValue(breadcrumb.data) as typeof breadcrumb.data
  return breadcrumb
}
