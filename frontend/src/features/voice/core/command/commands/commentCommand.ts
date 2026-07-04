import { resolveTaskRef } from '../../resolve/entityResolver'
import { capitalizeFirst, stripFillers } from '../../../textUtils'
import type { VoiceCommand } from '../types'

/**
 * Команда «прокомментируй … <текст>» (ТП-99 / C3). Добавляет комментарий к
 * задаче (открытой «эту» или по коду). Тело = текст после триггера; проходит
 * безопасное форматирование (регистр/междометия), смысл не меняется. safe —
 * действие аддитивное и сразу видно; низкая уверенность подтверждается гейтом.
 */
const BODY_MIN = 2

const COMMENT_TRIGGER =
  /^\s*(?:добавь\s+|напиши\s+|остав[ья]\s+)?(?:прокомментируй|коммент(?:арий|)|комментарий)\s*(?:к\s+)?(?:эт[уо]\s+задач\w*|это\s+задач\w*|задач\w*|[a-zа-яё]{2,4}\s*-?\s*\d{1,6})?\s*[:.,—-]*\s*/iu

export const commentCommand: VoiceCommand = {
  id: 'task.comment',
  title: 'Добавить комментарий',
  description: 'Добавляет комментарий к задаче (открытой или по коду).',
  examples: [
    'Прокомментируй эту задачу нужно уточнить сроки',
    'Добавь комментарий к ТП-90 согласовано с командой',
  ],
  riskLevel: 'safe',
  keywords: ['прокомментируй', 'комментарий', 'коммент', 'напиши'],
  slots: [{ name: 'q', description: 'Задача и текст комментария', required: true }],

  rule(text) {
    const m = COMMENT_TRIGGER.exec(text)
    if (!m) return null
    const body = text.slice(m[0].length).trim()
    if (!body) return null
    return { slots: { q: text }, confidence: 0.92 }
  },

  prepare(raw, ctx) {
    const text = raw.q ?? raw.content ?? raw.text ?? ''
    const m = COMMENT_TRIGGER.exec(text)
    const body = capitalizeFirst(stripFillers((m ? text.slice(m[0].length) : text).trim()))

    if (body.length < BODY_MIN) {
      return {
        ok: false,
        clarification: 'Не расслышал текст комментария. Продиктуйте его после команды.',
      }
    }

    const ref = resolveTaskRef(text, ctx)
    if (ref.kind !== 'ok' && !ctx.openTask) {
      return {
        ok: false,
        clarification: 'К какой задаче комментарий? Откройте задачу или назовите код.',
      }
    }

    const taskLabel =
      ref.kind === 'ok'
        ? ref.value.kind === 'open'
          ? ref.value.task.code
          : ref.value.code
        : (ctx.openTask?.code ?? 'задача')

    return {
      ok: true,
      summary: `Комментарий к ${taskLabel}: «${body}»`,
      run: async (context) => {
        let taskId: string | undefined
        let code = taskLabel
        if (ref.kind === 'ok' && ref.value.kind === 'code') {
          const found = await context.findTask(ref.value.code)
          taskId = found?.id
          if (found) code = found.code
        } else if (ref.kind === 'ok' && ref.value.kind === 'open') {
          taskId = ref.value.task.id
        } else {
          taskId = context.openTask?.id
        }
        if (!taskId) return { message: 'Задача не найдена — проверьте код.' }
        await context.addComment(taskId, body)
        return { message: `Комментарий добавлен к ${code}`, taskCode: code }
      },
    }
  },
}
