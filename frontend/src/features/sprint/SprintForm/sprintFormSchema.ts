import { z } from 'zod'

export const sprintFormSchema = z
  .object({
    // ТП-70: название опционально — идентификатор спринта это даты и статус;
    // если указано, короткие имена тоже допустимы («v2», «MVP»).
    name: z.string().max(120, 'Максимум 120 символов').optional().or(z.literal('')),
    goal: z.string().optional(),

    startDate: z.number().or(z.null()),
    // ТП-48: длительность задаётся датой завершения — тот же формат
    // и календарь, что у даты старта (timestamp | null).
    endDate: z.number().or(z.null()),
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate > v.startDate,
    {
      message: 'Дата завершения должна быть позже даты старта',
      path: ['endDate'],
    },
  )
