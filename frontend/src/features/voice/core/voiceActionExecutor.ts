import type { VoiceField, VoiceIntent } from './intentAnalyzer'
import type { TaskDraft, TextFormatter } from './textFormatter'

/**
 * ТП-88: выполняет действие голосового ввода по уже определённому намерению.
 * Слабо связан: ничего не знает о распознавании и об анализе намерений —
 * получает намерение + сырой текст + форматтер + обработчики места вызова.
 * Новые действия добавляются сюда, не затрагивая остальной конвейер.
 */
export type VoiceActionHandlers = {
  /** Черновик задачи (режим создания): название + описание. */
  onTaskDraft?: (draft: TaskDraft) => void
  /** Текст для конкретного поля (диктовка в карточке/комментарии). */
  onFieldText?: (field: VoiceField, text: string) => void
}

export function executeVoiceAction(
  intent: VoiceIntent,
  rawText: string,
  formatter: TextFormatter,
  handlers: VoiceActionHandlers,
): void {
  if (intent.type === 'CREATE_TASK') {
    handlers.onTaskDraft?.(formatter.toTaskDraft(rawText))
    return
  }
  handlers.onFieldText?.(intent.field, formatter.formatDictation(rawText))
}
