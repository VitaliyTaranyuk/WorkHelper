import { transcriptToTaskDraft } from '../../../textUtils'
import type { VoiceCommand } from '../types'

/**
 * Команда «создай задачу …» (ТП-91 / F1) — восстановлена из ТП-22
 * (`commands/createTaskCommand.ts`, коммит 211d152~1) и эволюционирована:
 * убран собственный regex-`match` (распознавание теперь в резолвере ТП-94),
 * добавлены `prepare`/`summary`/`riskLevel`.
 *
 * Слот `content` — текст задачи; разбивается тем же `transcriptToTaskDraft`, что
 * и диктовка задачи (ТП-88): первая мысль → название, остальное → описание.
 * Задача создаётся в спринте по умолчанию (Backlog — «входящие»), тип TASK,
 * приоритет MEDIUM — как обычное создание без уточнений.
 */

// Название на бэкенде: min 5 символов (schema формы создания, ТП-22).
const TITLE_MIN = 5

export const createTaskCommand: VoiceCommand = {
  id: 'task.create',
  title: 'Создать задачу',
  description:
    'Создаёт новую задачу в текущем проекте (спринт по умолчанию, тип TASK). ' +
    'Первое предложение — название, остальное — описание.',
  examples: [
    'Создай задачу купить хлеб',
    'Добавь задачу подготовить отчёт до пятницы',
    'Новая задача починить логин на проде',
  ],
  riskLevel: 'safe',
  slots: [
    {
      name: 'content',
      description:
        'Текст задачи: первое предложение — название, остальное — описание',
      required: true,
      examples: ['купить хлеб', 'подготовить отчёт. дедлайн пятница'],
    },
  ],

  prepare(raw, ctx) {
    const blob = raw.content ?? raw.title ?? raw.text ?? ''
    const draft = transcriptToTaskDraft(blob)

    if (draft.title.trim().length < TITLE_MIN) {
      return {
        ok: false,
        clarification:
          'Не расслышал название задачи. Скажите, например: «Создай задачу подготовить отчёт».',
      }
    }

    const summary = draft.description
      ? `Создать задачу «${draft.title}» с описанием`
      : `Создать задачу «${draft.title}»`

    return {
      ok: true,
      summary,
      run: async (context) => {
        const created = await context.createTask({
          title: draft.title,
          taskType: 'TASK',
          priority: 'MEDIUM',
          sprintId: ctx.defaultSprintId,
          ...(draft.description ? { description: draft.description } : {}),
        })
        return {
          message: `Создана задача ${created.code} «${created.title}»`,
          taskCode: created.code,
        }
      },
    }
  },
}
