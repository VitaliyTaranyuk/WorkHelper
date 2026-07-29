import { workTechApi } from '@/shared/api/endpoint'
import { takePendingDictation } from '@/features/voice/activeDictation'

/**
 * Фоновое дописывание надиктованного описания созданной задаче (ТП-241).
 *
 * Зачем: «Создать» можно нажать прямо во время диктовки — тогда задача
 * создаётся с локально отформатированным текстом, а вычищенный моделью вариант
 * (пунктуация, заглавные, без слов-паразитов) приходит через несколько секунд,
 * когда форма уже закрыта. Раньше он в этот момент просто пропадал.
 *
 * Второго запроса к модели не делается: используется тот же промис, который
 * уже ждёт конвейер диктовки ({@link takePendingDictation}).
 *
 * Применяется, только если задача создана ИМЕННО с этим текстом: если
 * улучшение успело попасть в форму до отправки или пользователь дописал
 * что-то руками — слот не подходит и молча отбрасывается. Сервер проверяет то
 * же самое ещё раз (compare-and-set по `expectedDescription`).
 *
 * @returns вычищенное описание, если оно РЕАЛЬНО применено; иначе `null`.
 */
export async function upgradeDictatedDescription({
  projectId,
  taskId,
  createdDescription,
}: {
  projectId: string
  taskId: string
  createdDescription: string | undefined
}): Promise<string | null> {
  const pending = takePendingDictation()
  if (!pending || !createdDescription) return null
  if (pending.local !== createdDescription) return null

  const description = await pending.enhanced
  if (!description || description === pending.local) return null

  try {
    const { data } = await workTechApi.task.applyAutoDescription({
      projectId,
      taskId,
      data: { description, expectedDescription: pending.local },
    })
    return data.description === description ? description : null
  } catch {
    return null
  }
}
