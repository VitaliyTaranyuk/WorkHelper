import { transcriptToTaskDraft } from '../../../textUtils'
import type { VoiceCommand } from '../types'

/**
 * Команда «создай баг …» (ТП-97 / C1). Как создание задачи, но taskType=BUG.
 * Отдельная команда (а не флаг) — чтобы триггер «баг/ошибка/дефект» уверенно
 * отличался от обычной задачи.
 */
const TITLE_MIN = 5

const BUG_TRIGGER =
  /^\s*(созда(?:й|йте|ть)|добав(?:ь|ьте|ить)|заведи(?:те)?|нов(?:ый|ую|ое)|заре(?:гистрируй|гистрировать))\s+(?:баг|ошибк[ауи]|дефект)\s*[:.,!-]*\s*/iu

export const createBugCommand: VoiceCommand = {
  id: 'task.bug',
  title: 'Создать баг',
  description: 'Создаёт задачу-баг (тип BUG) в текущем проекте.',
  examples: [
    'Заведи баг не грузится доска',
    'Создай ошибку падает логин на проде',
  ],
  riskLevel: 'safe',
  keywords: ['баг', 'ошибка', 'ошибку', 'дефект', 'заведи', 'создай', 'зарегистрируй'],
  slots: [
    { name: 'content', description: 'Описание бага', required: true },
  ],

  rule(text) {
    const m = BUG_TRIGGER.exec(text)
    if (!m) return null
    return { slots: { content: text.slice(m[0].length).trim() }, confidence: 0.95 }
  },

  prepare(raw, ctx) {
    const blob = (raw.content ?? raw.text ?? '').replace(BUG_TRIGGER, '')
    const draft = transcriptToTaskDraft(blob)
    if (draft.title.trim().length < TITLE_MIN) {
      return {
        ok: false,
        clarification:
          'Не расслышал суть бага. Скажите, например: «Заведи баг не открывается задача».',
      }
    }
    const summary = `Создать баг «${draft.title}»`
    return {
      ok: true,
      summary,
      run: async (context) => {
        const created = await context.createTask({
          title: draft.title,
          taskType: 'BUG',
          priority: 'MEDIUM',
          sprintId: ctx.defaultSprintId,
          ...(draft.description ? { description: draft.description } : {}),
        })
        return {
          message: `Создан баг ${created.code} «${created.title}»`,
          taskCode: created.code,
        }
      },
    }
  },
}
