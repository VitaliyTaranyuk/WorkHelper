import { SPRINT_DURATION_MAX } from '@/entities/sprint/constants'
import { z } from 'zod'

export const sprintFormSchema = z.object({
  // TODO: уточнить по максимуму для заголовка
  name: z.string().min(5, 'Минимальная длина 5 символов'),
  goal: z.string().optional(),

  startDate: z.number().or(z.null()),
  duration: z.coerce.number().or(z.null()),
})

export function transformDurationByLimit(v: unknown) {
  const num = typeof v === 'number' ? v : Number(v)

  if (!num || Number.isNaN(num) || num < 0) return null

  if (num > SPRINT_DURATION_MAX) return SPRINT_DURATION_MAX

  return num
}
