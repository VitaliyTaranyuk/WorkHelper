import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

/**
 * ТП-208 (ТП-212 — TASK_DRAFT): режим улучшения текста, совпадает с backend
 * VoiceEnhanceMode.
 */
export type VoiceEnhanceMode = 'DICTATION' | 'TITLE' | 'TASK_DRAFT'

export type VoiceEnhanceResponseDto = {
  text: string
  /** true — текст реально улучшен DeepSeek; false — сервер вернул фолбэк как есть. */
  enhanced: boolean
  /** Только для TASK_DRAFT: название задачи (пустое — суть не ясна, не выдумываем). */
  title?: string | null
  /** Только для TASK_DRAFT: вычищенное описание. */
  description?: string | null
}

export function enhanceVoiceText({
  text,
  mode,
  otherParams = {},
}: {
  text: string
  mode: VoiceEnhanceMode
  otherParams?: RequestParams
}) {
  return workTechApiClient<VoiceEnhanceResponseDto>({
    method: 'POST',
    url: API_ENDPOINT_PATH.VOICE.ENHANCE_TEXT(),
    data: { text, mode },
    ...otherParams,
  })
}
