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
 * ТП-88: единый конвейер голосового ВВОДА (локально, без внешних AI/LLM):
 *
 *   SpeechRecognition (Web Speech API, ru-RU)
 *     → IntentAnalyzer (заглушка: намерение = контекст вызова)
 *     → TextFormatter (регистр/пунктуация/деление на название и описание)
 *     → VoiceActionExecutor (вставка в поле / черновик задачи)
 *
 * Голос — способ ВВОДА, а не помощник: речь не анализируется на намерение,
 * действие задаёт место вызова (context). Слои независимы и заменяемы (этап 2 —
 * LLM-реализация IntentAnalyzer без изменения остального кода).
 *
 * Возвращает состояние распознавания (supported/status/error) и управление
 * (start/stop/cancel) — для кнопки/индикации в UI.
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
  // onFinish пересоздаётся каждый рендер, но useSpeechRecognition держит его в
  // ref — переподписки на распознавание не происходит.
  const onFinish = (transcript: string) => {
    const text = transcript.trim()
    if (!text) {
      onEmpty?.()
      return
    }
    const intent = stubIntentAnalyzer.analyze(text, context)
    executeVoiceAction(intent, text, localTextFormatter, handlers)
  }

  return useSpeechRecognition({ onFinish })
}
