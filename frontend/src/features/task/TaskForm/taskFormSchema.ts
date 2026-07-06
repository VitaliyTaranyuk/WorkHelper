import { TASK_PRIORITY_TUPPLE, TASK_TYPE_TUPPLE } from '@/entities/task/types'
import { z } from 'zod'

export const compactTaskFormSchema = z.object({
  // TODO: уточнить по максимуму для заголовка
  taskTitle: z.string().min(5, 'Минимальная длина 5 символов'),
  description: z.string().optional(),

  priority: z.enum(TASK_PRIORITY_TUPPLE),

  type: z.enum(TASK_TYPE_TUPPLE),

  // ID исполнителя или '-1' для "Не назначен"
  assignee: z.string(),

  sprint: z.string(),

  // Колонка доски (id статуса) для создания задачи; null — по умолчанию
  // (первая колонка на бэкенде); не используется формой редактирования.
  status: z.number().nullable().optional(),
})

/**
 * Схема СОЗДАНИЯ (ТП-147): название можно не указывать, если заполнено
 * описание — оно сформируется автоматически (prepareTaskCard). Редактирование
 * остаётся на compactTaskFormSchema: там пустое название недопустимо.
 */
export const createTaskFormSchema = compactTaskFormSchema
  .omit({ taskTitle: true })
  .extend({ taskTitle: z.string() })
  .superRefine((data, ctx) => {
    const title = data.taskTitle.trim()
    if (title.length === 0) {
      if ((data.description ?? '').trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['taskTitle'],
          message:
            'Укажите название или заполните описание — название сформируется из него',
        })
      }
      return
    }
    if (title.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taskTitle'],
        message: 'Минимальная длина 5 символов',
      })
    }
  })

