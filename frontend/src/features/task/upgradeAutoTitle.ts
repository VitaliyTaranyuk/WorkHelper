import { workTechApi } from '@/shared/api/endpoint'
import { enhanceTextSafe, BACKGROUND_TIMEOUT_MS } from '@/shared/text/enhanceText'

/**
 * Фоновое улучшение автоматического названия задачи (ТП-239 / ТП-240).
 *
 * Задача уже создана и форма закрыта — здесь никто не ждёт, поэтому модели
 * отдаётся полное описание с фоновым бюджетом времени вместо интерактивного.
 * Именно интерактивный лимит и был причиной плохих названий: замер на проде
 * показал ответ DeepSeek за 3.5–6.5 с при обрыве на пяти секундах.
 *
 * Инварианты:
 *  1. Вызывается ТОЛЬКО для названия, сформированного движком: название,
 *     введённое человеком, неприкосновенно (правило 1 `prepareTaskCard`).
 *  2. Никогда не бросает и ничего не ломает: не удалось улучшить — у задачи
 *     остаётся детерминированное название `generateTaskTitle`.
 *  3. Замена условная на сервере (compare-and-set по `expectedTitle`): если за
 *     эти секунды название задали руками, запрос становится no-op.
 *
 * @returns улучшенное название, если оно РЕАЛЬНО применено на сервере;
 *          `null` — если улучшения не было или его отклонили.
 */
export async function upgradeAutoTitle({
  projectId,
  taskId,
  description,
  createdTitle,
}: {
  projectId: string
  taskId: string
  description: string
  createdTitle: string
}): Promise<string | null> {
  if (!description.trim() || !createdTitle) return null

  const title = await enhanceTextSafe(description, 'TITLE', createdTitle, {
    timeoutMs: BACKGROUND_TIMEOUT_MS,
  })
  if (title === createdTitle) return null

  try {
    const { data } = await workTechApi.task.applyAutoTitle({
      projectId,
      taskId,
      data: { title, expectedTitle: createdTitle },
    })
    // Сервер возвращает задачу как есть: совпало — применил, не совпало —
    // название успели поменять руками, и перерисовывать списки незачем.
    return data.title === title ? title : null
  } catch {
    return null
  }
}
