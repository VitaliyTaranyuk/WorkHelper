import type { VoiceCommand } from '../types'
import { transcriptToTaskDraft, type TaskDraft } from '../textUtils'

/**
 * Голосовая команда «создай задачу …» (MVP ТП-22).
 *
 * Триггеры: «создай/создать/добавь/добавить/новая задача(у)». Всё после
 * триггера — содержимое: первое предложение → название, остальное → описание.
 * Задача создаётся в спринте по умолчанию (Backlog — «входящие»),
 * тип TASK, приоритет MEDIUM — как у обычного создания без уточнений.
 */
const TRIGGER =
  /^\s*(создай(те)?|создать|добавь(те)?|добавить|новая|новую|новое)\s+(задач[ауи]|задание|таск)\s*[.,:!-]*\s*/iu

// Название задачи на бэкенде: min 5 символов (schema формы создания).
const TITLE_MIN = 5

export const createTaskCommand: VoiceCommand<TaskDraft> = {
  id: 'create-task',
  hint: '«Создай задачу. <название>. <описание…>»',

  match(transcript) {
    const m = transcript.match(TRIGGER)
    if (!m) return null
    const body = transcript.slice(m[0].length)
    const draft = transcriptToTaskDraft(body)
    return draft.title.length > 0 ? draft : { title: '' }
  },

  async execute(draft, ctx) {
    if (draft.title.length < TITLE_MIN) {
      throw new Error(
        'Не расслышал содержание задачи — назовите её после слов «создай задачу»',
      )
    }
    const created = await ctx.createTask({
      projectId: ctx.projectId,
      sprintId: ctx.defaultSprintId,
      title: draft.title,
      taskType: 'TASK',
      priority: 'MEDIUM',
      ...(draft.description ? { description: draft.description } : {}),
    })
    return {
      message: `Создана задача ${created.code} «${draft.title}»`,
      taskCode: created.code,
    }
  },
}
