import { ESTIMATION_MAX } from '@/entities/task/constants'
import { TASK_PRIORITY_TUPPLE, TASK_TYPE_TUPPLE } from '@/entities/task/types'
import { z } from 'zod'

export const compactTaskFormSchema = z.object({
  // TODO: уточнить по максимуму для заголовка
  taskTitle: z.string().min(5, 'Минимальная длина 5 символов'),
  description: z.string().optional(),

  priority: z.enum(TASK_PRIORITY_TUPPLE),

  type: z.enum(TASK_TYPE_TUPPLE),

  estimation: z.coerce.number().or(z.null()),

  // ID исполнителя или '-1' для "Не назначен"
  assignee: z.string(),

  sprint: z.string(),
})

export function transformEstimaionByLimit(v: unknown) {
  const num = typeof v === 'number' ? v : Number(v)

  if (!num || Number.isNaN(num) || num < 0) return null

  if (num > ESTIMATION_MAX) return ESTIMATION_MAX

  return num
}
