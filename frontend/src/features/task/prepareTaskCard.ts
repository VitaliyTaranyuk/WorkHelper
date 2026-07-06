import { generateTaskTitle } from '@/shared/text/generateTaskTitle'

/**
 * Единая подготовка карточки задачи перед созданием (ТП-147, ТП-153).
 *
 * Правила:
 * 1. Название, введённое пользователем, — неприкосновенно (только trim).
 * 2. Название пустое, описание заполнено → название формирует ЕДИНЫЙ движок
 *    generateTaskTitle (shared/text) — тот же, что у голосового драфта;
 *    второго алгоритма формирования названий в системе нет (ТП-153).
 * 3. Описание не переписывается: смысл и формулировки пользователя
 *    сохраняются (допустим только trim).
 *
 * Расширение (авто-классификация, рекомендации приоритета и т.п.) добавляется
 * сюда новыми шагами, не трогая точки создания.
 */

export type TaskCardDraft = {
  title: string
  description: string
}

export function prepareTaskCard(input: {
  title: string
  description: string
}): TaskCardDraft {
  const title = input.title.trim()
  const description = input.description.trim()

  if (title.length > 0) return { title, description }
  if (description.length > 0)
    return { title: generateTaskTitle(description), description }
  return { title: '', description: '' }
}

/**
 * Единый payload создания задачи из значений формы — используется всеми
 * точками создания (модалка, страница /task/create); раньше каждая собирала
 * DTO сама (дублирование).
 */
export function buildCreateTaskPayload(
  values: {
    taskTitle: string
    description?: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    type: 'TASK' | 'BUG'
    assignee: string
    sprint: string
    status?: number | null
  },
  projectId: string,
) {
  const draft = prepareTaskCard({
    title: values.taskTitle,
    description: values.description ?? '',
  })
  return {
    title: draft.title,
    projectId,
    priority: values.priority,
    taskType: values.type,
    sprintId: values.sprint,
    ...(draft.description ? { description: draft.description } : {}),
    // '-1' — опция «Не назначен» (NOT_ASSIGNED_OPTION)
    ...(values.assignee === '-1' ? {} : { assignee: values.assignee }),
    // Выбранная колонка доски (ТП-36); для Backlog-спринта поле обнулено
    ...(values.status != null ? { statusId: values.status } : {}),
  }
}
