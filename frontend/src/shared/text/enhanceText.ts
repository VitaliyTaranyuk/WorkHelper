import { workTechApi } from '@/shared/api/endpoint'
import type { VoiceEnhanceMode } from '@/shared/api/endpoint/voiceApi'

export type { VoiceEnhanceMode }

/** Таймаут запроса к DeepSeek-прокси — голосовой ввод не должен зависать. */
const ENHANCE_TIMEOUT_MS = 6000

/**
 * Улучшение текста через backend-прокси DeepSeek (ТП-208): очистка
 * распознанной речи (DICTATION) или переформулирование названия задачи
 * (TITLE). ВСЕГДА резолвится — при любой ошибке сети/таймауте/выключенном
 * ключе на сервере тихо возвращает переданный локальный (детерминированный,
 * ТП-88/ТП-166) результат. Голосовой ввод и создание задачи не должны
 * зависеть от доступности стороннего API.
 */
export async function enhanceTextSafe(
  local: string,
  mode: VoiceEnhanceMode,
): Promise<string> {
  if (!local.trim()) return local

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ENHANCE_TIMEOUT_MS)
  try {
    const { data } = await workTechApi.voice.enhanceVoiceText({
      text: local,
      mode,
      otherParams: { signal: controller.signal },
    })
    return data.enhanced && data.text.trim() ? data.text.trim() : local
  } catch {
    return local
  } finally {
    clearTimeout(timer)
  }
}
