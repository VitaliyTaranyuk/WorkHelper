import { AxiosError } from 'axios'

export type FieldErrors = Record<string, string>

/**
 * Извлекает field-ошибки из ответа backend.
 *
 * Backend GlobalExceptionHandler возвращает валидационные ошибки в форме:
 *   { "title": ["Поле TITLE не может быть пустым"], "priority": ["..."] }
 *
 * Эта утилита превращает их в плоский Record<field, firstMessage>, чтобы
 * UI-формы могли показывать ошибку рядом с конкретным полем (как в Jira/Linear/
 * ClickUp), а не выводить общий «не удалось сохранить».
 */
export function extractFieldErrors(err: unknown): FieldErrors | null {
  if (!(err instanceof AxiosError)) return null
  const data = err.response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null

  const out: FieldErrors = {}
  for (const [field, val] of Object.entries(data)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
      out[field] = val[0]
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Достаёт общее (не-field) сообщение об ошибке от backend. */
export function extractGeneralError(err: unknown): string | null {
  if (!(err instanceof AxiosError)) return null
  const data = err.response?.data
  // Backend в части случаев отдаёт plain-string (handleDataIntegrityViolation
  // и т.п.) или { message: "..." } или { error: "..." }.
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const r = data as Record<string, unknown>
    if (typeof r.message === 'string' && r.message.trim()) return r.message.trim()
    if (typeof r.error === 'string' && r.error.trim()) return r.error.trim()
  }
  if (err.response?.status && err.response.status >= 500) {
    return 'Внутренняя ошибка сервера. Попробуйте позже.'
  }
  if (err.message === 'Network Error') {
    return 'Нет связи с сервером. Проверьте интернет-соединение.'
  }
  return null
}
