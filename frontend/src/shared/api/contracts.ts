import { z } from 'zod'
import { captureMonitoredError } from '@/shared/monitoring/init'

/**
 * Валидация ответов API на границе (ТП-176, T6 из post-mortem ТП-172).
 *
 * Некорректная форма ответа — это ОБРАБАТЫВАЕМАЯ ошибка запроса (попадает в
 * error-состояние React Query и существующие фолбэки: «не удалось загрузить»,
 * тосты), а не TypeError глубоко в рендере с белым экраном.
 *
 * Принципы схем:
 *  - строго валидируются только поля, от которых зависит рендер/логика
 *    (id, статусы, токены) — «горячие» контракты;
 *  - НЕЛОМКОСТЬ к аддитивным изменениям: новые поля бэкенда не считаются
 *    ошибкой (z.object в zod по умолчанию их пропускает) — иначе валидация
 *    сама стала бы источником ложных крашей;
 *  - дрейф контракта отправляется в прод-мониторинг (ТП-175): команда видит
 *    рассинхрон фронт↔бэк до жалоб пользователей.
 */
export class ApiContractError extends Error {
  readonly contract: string
  readonly issues: z.ZodIssue[]

  constructor(contract: string, issues: z.ZodIssue[]) {
    const detail = issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '(корень)'}: ${i.message}`)
      .join('; ')
    super(`Ответ API не соответствует контракту «${contract}»: ${detail}`)
    this.name = 'ApiContractError'
    this.contract = contract
    this.issues = issues
  }
}

/**
 * Провалидировать данные по схеме контракта; несоответствие — исключение.
 * Возвращает ИСХОДНЫЕ данные (не zod-выход): схема — гейт «горячих» полей,
 * а мапперы дальше читают и поля вне схемы (creator, даты, …) — стрипать
 * их валидацией нельзя.
 */
export function parseContract<T>(
  schema: z.ZodTypeAny,
  data: T,
  contract: string,
): T {
  const result = schema.safeParse(data)
  if (result.success) return data
  const error = new ApiContractError(contract, result.error.issues)
  captureMonitoredError(error, { area: `контракт API: ${contract}` })
  throw error
}

// ─── Горячие контракты (по post-mortem ТП-172) ─────────────────────────────

/** Статус задачи — от него зависит доска/карточка (id обязателен для колонок). */
const taskStatusSchema = z.object({
  id: z.number(),
  code: z.string(),
})

/**
 * Задача (детально и в списках). Обязательны поля, на которых строится
 * рендер карточки/плитки; описание и люди — опциональны (в списковых
 * выдачах тело описания не передаётся, ТП-187).
 */
export const taskDataSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  code: z.string().min(1),
  priority: z.string(),
  taskType: z.string(),
  projectId: z.string(),
  status: taskStatusSchema,
  description: z.string().nullish(),
  sprintId: z.string().nullish(),
  position: z.number().optional(),
  archived: z.boolean().optional(),
  awaitingReply: z.boolean().optional(),
})

/** Спринт со списком задач (раздел «Список задач», доска). */
export const sprintMinSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullish(),
  active: z.boolean(),
  paused: z.boolean().optional(),
  defaultSprint: z.boolean().optional(),
  tasks: z.array(taskDataSchema).nullish(),
})

export const sprintListSchema = z.object({
  sprints: z.array(sprintMinSchema).nullish(),
})

/** Комната Meet: token — вход в звонок, maxParticipants — предел mesh. */
export const meetRoomSchema = z.object({
  token: z.string().min(1),
  title: z.string(),
  projectId: z.string().min(1),
  projectName: z.string().nullish(),
  meetingId: z.string().nullish(),
  taskId: z.string().nullish(),
  taskCode: z.string().nullish(),
  createdByName: z.string().nullish(),
  maxParticipants: z.number(),
})
