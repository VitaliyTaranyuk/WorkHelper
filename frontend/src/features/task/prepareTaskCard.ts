import { splitSentences } from '@/features/voice/textUtils'

/**
 * Единая подготовка карточки задачи перед созданием (ТП-147).
 *
 * Правила:
 * 1. Название, введённое пользователем, — неприкосновенно (только trim).
 * 2. Название пустое, описание заполнено → название формируется из первой
 *    законченной мысли описания (первое предложение, обрезка по границе
 *    слова до лимита) — тот же принцип, что у голосового драфта задачи
 *    (transcriptToTaskDraft), поведение всех способов создания едино.
 * 3. Описание не переписывается: смысл и формулировки пользователя
 *    сохраняются (допустим только trim).
 *
 * Расширение (авто-классификация, рекомендации приоритета и т.п.) добавляется
 * сюда новыми шагами, не трогая точки создания.
 */

/** Мягкий предел названия — как краткие summary зрелых TMS (см. textUtils). */
const TITLE_MAX_CHARS = 80

export type TaskCardDraft = {
  title: string
  description: string
}

/** Первая мысль текста, обрезанная по границе слова, без финальной точки. */
export function deriveTitleFromDescription(description: string): string {
  const first = splitSentences(description.trim())[0] ?? ''
  const sentence = first.replace(/[.!?…]+$/, '').trim()
  if (sentence.length <= TITLE_MAX_CHARS) return sentence

  const words = sentence.split(/\s+/)
  let title = words[0] ?? ''
  for (const word of words.slice(1)) {
    if (`${title} ${word}`.length > TITLE_MAX_CHARS) break
    title = `${title} ${word}`
  }
  // Одно слово длиннее лимита — жёсткая обрезка, чтобы не упереться в 255 бэкенда.
  return title.length > TITLE_MAX_CHARS ? title.slice(0, TITLE_MAX_CHARS) : title
}

export function prepareTaskCard(input: {
  title: string
  description: string
}): TaskCardDraft {
  const title = input.title.trim()
  const description = input.description.trim()

  if (title.length > 0) return { title, description }
  if (description.length > 0)
    return { title: deriveTitleFromDescription(description), description }
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
