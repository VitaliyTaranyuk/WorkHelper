import { useState } from 'react'
import { useSpeechRecognition } from './useSpeechRecognition'
import {
  stubIntentAnalyzer,
  type VoiceContext,
} from './core/intentAnalyzer'
import { localTextFormatter } from './core/textFormatter'
import {
  executeVoiceAction,
  type VoiceActionHandlers,
} from './core/voiceActionExecutor'

/**
 * ТП-88: единый конвейер голосового ВВОДА:
 *
 *   SpeechRecognition (Web Speech API, ru-RU)
 *     → IntentAnalyzer (заглушка: намерение = контекст вызова)
 *     → TextFormatter (регистр/пунктуация/деление на название и описание)
 *     → VoiceActionExecutor (вставка в поле / черновик задачи; ТП-208 —
 *       внутри дополнительно улучшает текст через backend-прокси DeepSeek)
 *
 * Голос — способ ВВОДА, а не помощник: речь не анализируется на намерение,
 * действие задаёт место вызова (context). Слои независимы и заменяемы (этап 2 —
 * LLM-реализация IntentAnalyzer без изменения остального кода).
 *
 * Возвращает состояние распознавания (supported/status/error), `enhancing`
 * (ТП-208: идёт запрос улучшения текста — короткое честное состояние
 * ожидания на кнопке диктовки) и управление (start/stop/cancel) — для
 * кнопки/индикации в UI.
 */
export function useVoiceInput({
  context,
  handlers,
  onEmpty,
}: {
  context: VoiceContext
  handlers: VoiceActionHandlers
  /** Ничего не распознано — для сообщения пользователю. */
  onEmpty?: () => void
}) {
  const [enhancing, setEnhancing] = useState(false)

  // onFinish пересоздаётся каждый рендер, но useSpeechRecognition держит его в
  // ref — переподписки на распознавание не происходит.
  const onFinish = async (transcript: string) => {
    const text = transcript.trim()
    if (!text) {
      onEmpty?.()
      return
    }
    const intent = stubIntentAnalyzer.analyze(text, context)
    setEnhancing(true)
    try {
      await executeVoiceAction(intent, text, localTextFormatter, handlers)
    } finally {
      setEnhancing(false)
    }
  }

  const speech = useSpeechRecognition({ onFinish })
  return { ...speech, enhancing }
}
