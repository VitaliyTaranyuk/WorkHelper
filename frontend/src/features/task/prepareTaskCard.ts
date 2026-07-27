import { generateTaskTitle } from '@/shared/text/generateTaskTitle'
import { enhanceTextSafe } from '@/shared/text/enhanceText'
import type { TaskPriority, TaskType } from '@/entities/task/types'

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
 * Асинхронный вариант (ТП-208): название, введённое пользователем,
 * по-прежнему неприкосновенно (правило 1) — DeepSeek вызывается ТОЛЬКО для
 * автоматически сгенерированного названия (правило 2); при
 * недоступности/ошибке/таймауте остаётся детерминированный результат
 * generateTaskTitle без изменений.
 *
 * ТП-212: модели отдаётся ПОЛНОЕ описание (постановка), а не локальный
 * заголовок. Раньше на вход уходил результат generateTaskTitle, уже урезанный
 * до 70 символов по границе слова, — модель переформулировала огрызок и не
 * могла увидеть контекст, который в этот лимит не поместился.
 */
export async function prepareTaskCardAsync(input: {
  title: string
  description: string
}): Promise<TaskCardDraft> {
  const draft = prepareTaskCard(input)
  if (input.title.trim().length > 0 || !draft.title) return draft
  const title = await enhanceTextSafe(draft.description, 'TITLE', draft.title)
  return { ...draft, title }
}

/**
 * Единый payload создания задачи из значений формы — используется всеми
 * точками создания (модалка, страница /task/create); раньше каждая собирала
 * DTO сама (дублирование).
 */
export async function buildCreateTaskPayload(
  values: {
    taskTitle: string
    description?: string
    // Значения перечислений — из общих типов сущности, а не литералами:
    // локальная копия набора уже расходилась с бэкендом (инцидент 2026-07-28).
    priority: TaskPriority
    type: TaskType
    assignee: string
    sprint: string
    status?: number | null
  },
  projectId: string,
) {
  const draft = await prepareTaskCardAsync({
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
