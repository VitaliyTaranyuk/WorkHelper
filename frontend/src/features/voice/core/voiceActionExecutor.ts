import type { VoiceField, VoiceIntent } from './intentAnalyzer'
import type { TaskDraft, TextFormatter } from './textFormatter'
import { enhanceTaskDraftSafe, enhanceTextSafe } from '@/shared/text/enhanceText'

/**
 * ТП-88: выполняет действие голосового ввода по уже определённому намерению.
 * Слабо связан: ничего не знает о распознавании и об анализе намерений —
 * получает намерение + сырой текст + форматтер + обработчики места вызова.
 * Новые действия добавляются сюда, не затрагивая остальной конвейер.
 *
 * ТП-208: после детерминированного форматтера (ТП-88, обязателен как мгновенный
 * и надёжный базовый результат) текст дополнительно проходит через
 * backend-прокси DeepSeek.
 *
 * ТП-212 — вставка стала НЕблокирующей: локальный результат отдаётся
 * обработчику сразу, а улучшенный приходит вторым вызовом с указанием, что он
 * заменяет. Пользователь не ждёт сеть с пустым полем, а надиктованное
 * физически не может потеряться — оно уже в поле к моменту запроса.
 */
export type VoiceActionHandlers = {
  /**
   * Черновик задачи (режим создания): название + описание. Вызывается дважды —
   * локальным разбором и (если улучшение удалось) улучшенным вариантом.
   */
  onTaskDraft?: (draft: TaskDraft) => void
  /**
   * Текст для конкретного поля (диктовка в карточке/комментарии).
   * `replaces` — ранее вставленный этим же вызовом текст, который следует
   * заменить; если его в поле уже нет (пользователь успел править), обработчик
   * обязан ничего не делать, чтобы не затирать правки.
   */
  onFieldText?: (field: VoiceField, text: string, replaces?: string) => void
}

export async function executeVoiceAction(
  intent: VoiceIntent,
  rawText: string,
  formatter: TextFormatter,
  handlers: VoiceActionHandlers,
): Promise<void> {
  if (intent.type === 'CREATE_TASK') {
    const local = formatter.toTaskDraft(rawText)
    handlers.onTaskDraft?.(local)
    if (!local.title) return
    const enhanced = await enhanceTaskDraftSafe(rawText, local)
    if (enhanced.title !== local.title || enhanced.description !== local.description) {
      handlers.onTaskDraft?.(enhanced)
    }
    return
  }

  const local = formatter.formatDictation(rawText)
  handlers.onFieldText?.(intent.field, local)
  const enhanced = await enhanceTextSafe(local, 'DICTATION')
  if (enhanced !== local) {
    handlers.onFieldText?.(intent.field, enhanced, local)
  }
}
