import { z } from 'zod'

export const sprintFormSchema = z
  .object({
    // TODO: уточнить по максимуму для заголовка
    name: z.string().min(5, 'Минимальная длина 5 символов'),
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
