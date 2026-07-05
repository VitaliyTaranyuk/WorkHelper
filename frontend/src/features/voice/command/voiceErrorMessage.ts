import {
  extractFieldErrors,
  extractGeneralError,
} from '@/shared/api/extractFieldErrors'

/**
 * Понятная причина сбоя голосовой команды (ТП-123). Раньше любой сбой выполнения
 * показывался немым «Не удалось выполнить команду», что скрывало реальную
 * причину (валидация, права, недоступность сервера) и мешало пользователю
 * понять, что произошло. Теперь достаём настоящее сообщение из ответа бэкенда:
 *   - общее сообщение (message/error/500/сеть) — extractGeneralError;
 *   - ошибки полей (валидация) — собираем в читаемую строку;
 *   - иначе — прежний общий текст как фолбэк.
 *
 * Переиспользует существующие утилиты разбора ошибок (те же, что в карточке
 * задачи) — единый разбор ответов бэкенда, без дублирования.
 */
export function voiceErrorMessage(err: unknown): string {
  const general = extractGeneralError(err)
  if (general) return general

  const fields = extractFieldErrors(err)
  if (fields) {
    const combined = Object.values(fields).join('; ')
    if (combined.trim()) return combined
  }

  return 'Не удалось выполнить команду'
}
