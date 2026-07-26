import { workTechApi } from '@/shared/api/endpoint'
import type { VoiceEnhanceMode } from '@/shared/api/endpoint/voiceApi'

export type { VoiceEnhanceMode }

/**
 * Таймауты клиента по режимам (ТП-212). Раньше был общий 6с, из-за чего
 * длинная диктовка стабильно не успевала: модель возвращает текст целиком,
 * поэтому её ответ тем дольше, чем больше надиктовано. Серверный таймаут выше
 * клиентского (см. app.deepseek.request-timeout-seconds) — сервер успевает
 * записать метрики даже когда клиент уже ушёл в фолбэк.
 */
const TIMEOUT_MS_BY_MODE: Record<VoiceEnhanceMode, number> = {
  TITLE: 5000,
  DICTATION: 12000,
  TASK_DRAFT: 12000,
}

/** Черновик задачи — минимальная форма, общая для голоса и формы создания. */
export type EnhancedTaskDraft = {
  title: string
  description?: string
}

/**
 * Потолок принимаемого названия (совпадает с серверным MAX_TITLE_LENGTH).
 * Сервер уже валидирует ответ модели, но название попадает в поле формы —
 * защита в глубину дешевле, чем простыня вместо заголовка, если контракт
 * когда-нибудь разъедется.
 */
const MAX_TITLE_CHARS = 140

function acceptable(text: string, mode: VoiceEnhanceMode): boolean {
  if (!text) return false
  return mode !== 'TITLE' || text.length <= MAX_TITLE_CHARS
}

/**
 * Улучшение текста через backend-прокси DeepSeek (ТП-208): очистка
 * распознанной речи (DICTATION) или формулирование названия задачи (TITLE).
 * ВСЕГДА резолвится — при любой ошибке сети/таймауте/выключенном ключе на
 * сервере тихо возвращает `fallback` (локальный детерминированный результат,
 * ТП-88/ТП-166). Голосовой ввод и создание задачи не должны зависеть от
 * доступности стороннего API.
 *
 * ТП-212: `source` (что отправляем модели) и `fallback` (что показываем при
 * неудаче) разделены. Для названия это принципиально — модели отдаётся ПОЛНОЕ
 * описание, а фолбэком служит локальный заголовок; раньше отправлялся сам
 * заголовок, уже обрезанный до 70 символов, и модель переформулировала огрызок.
 */
export async function enhanceTextSafe(
  source: string,
  mode: VoiceEnhanceMode,
  fallback: string = source,
): Promise<string> {
  if (!source.trim()) return fallback

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS_BY_MODE[mode])
  try {
    const { data } = await workTechApi.voice.enhanceVoiceText({
      text: source,
      mode,
      otherParams: { signal: controller.signal },
    })
    const text = data.text.trim()
    return data.enhanced && acceptable(text, mode) ? text : fallback
  } catch {
    return fallback
  } finally {
    clearTimeout(timer)
  }
}

/**
 * ТП-212: карточка задачи из надиктованной постановки одним вызовом
 * (TASK_DRAFT) — название и вычищенное описание сразу, без второго round-trip.
 * ВСЕГДА резолвится: при любой неудаче возвращается `fallback` — черновик
 * локального разбора (transcriptToTaskDraft + generateTaskTitle).
 *
 * Частичный ответ не принимается частично: пустое название от модели означает
 * «суть не ясна» — тогда остаётся локальное название, а не пустое поле.
 */
export async function enhanceTaskDraftSafe(
  source: string,
  fallback: EnhancedTaskDraft,
): Promise<EnhancedTaskDraft> {
  if (!source.trim()) return fallback

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS_BY_MODE.TASK_DRAFT)
  try {
    const { data } = await workTechApi.voice.enhanceVoiceText({
      text: source,
      mode: 'TASK_DRAFT',
      otherParams: { signal: controller.signal },
    })
    if (!data.enhanced) return fallback
    const description = data.description?.trim()
    if (!description) return fallback
    const title = data.title?.trim() ?? ''
    return {
      title: acceptable(title, 'TITLE') ? title : fallback.title,
      description,
    }
  } catch {
    return fallback
  } finally {
    clearTimeout(timer)
  }
}
