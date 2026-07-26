import type { VoiceField, VoiceIntent } from './intentAnalyzer'
import type { TaskDraft, TextFormatter } from './textFormatter'
import { enhanceTextSafe } from '@/shared/text/enhanceText'

/**
 * ТП-88: выполняет действие голосового ввода по уже определённому намерению.
 * Слабо связан: ничего не знает о распознавании и об анализе намерений —
 * получает намерение + сырой текст + форматтер + обработчики места вызова.
 * Новые действия добавляются сюда, не затрагивая остальной конвейер.
 *
 * ТП-208: после детерминированного форматтера (ТП-88, обязателен как
 * мгновенный и надёжный базовый результат) текст дополнительно проходит
 * через backend-прокси DeepSeek — очистка речи/переформулирование названия.
 * `enhanceTextSafe` ВСЕГДА резолвится (см. shared/text/enhanceText) — при
 * недоступности/таймауте остаётся исходный локальный результат, поведение
 * без настроенного ключа НЕ отличается от ТП-88.
 */
export type VoiceActionHandlers = {
  /** Черновик задачи (режим создания): название + описание. */
  onTaskDraft?: (draft: TaskDraft) => void
  /** Текст для конкретного поля (диктовка в карточке/комментарии). */
  onFieldText?: (field: VoiceField, text: string) => void
}

export async function executeVoiceAction(
  intent: VoiceIntent,
  rawText: string,
  formatter: TextFormatter,
  handlers: VoiceActionHandlers,
): Promise<void> {
  if (intent.type === 'CREATE_TASK') {
    const draft = formatter.toTaskDraft(rawText)
    const title = draft.title
      ? await enhanceTextSafe(draft.title, 'TITLE')
      : draft.title
    handlers.onTaskDraft?.({ ...draft, title })
    return
  }
  const local = formatter.formatDictation(rawText)
  const text = await enhanceTextSafe(local, 'DICTATION')
  handlers.onFieldText?.(intent.field, text)
}
