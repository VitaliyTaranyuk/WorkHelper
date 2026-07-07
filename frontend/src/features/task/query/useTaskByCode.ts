import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import { workTechApi } from '@/shared/api/endpoint'
import { parseContract, taskDataSchema } from '@/shared/api/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ITaskCard } from '@/entities/task/types'

/**
 * ТП-185 (skeleton-first, «проброс известных данных»): ищем задачу по коду
 * в уже загруженных кэшах (списки спринтов, завершённые) — если она есть,
 * карточка откроется МГНОВЕННО с известными полями (название, статус,
 * исполнитель), а полные детали освежатся в фоне. Список задач содержит
 * ITaskCard, поэтому shape совпадает с ответом useTaskByCode.
 */
function findCachedTaskByCode(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  taskCode: string,
): ITaskCard | undefined {
  const entries = queryClient.getQueriesData<unknown>({ queryKey: ['sprints', projectId] })
  for (const [, data] of entries) {
    const sprints = data as Array<{ tasks?: ITaskCard[] }> | undefined
    if (!Array.isArray(sprints)) continue
    for (const sprint of sprints) {
      const found = sprint.tasks?.find((t) => t.code === taskCode)
      if (found) return found
    }
  }
  const completed = queryClient.getQueryData<ITaskCard[]>(['tasks', projectId, 'completed'])
  return completed?.find((t) => t.code === taskCode)
}

export function useTaskByCode({
  projectId,
  taskCode,
}: {
  projectId: string | undefined
  // ТП-89: код опционален — карточка-модалка может открываться и по объекту
  // задачи (с доски/списка), тогда загрузка по коду не нужна.
  taskCode: string | undefined
}) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['tasks', projectId, taskCode],
    queryFn: async () => {
      const response = await workTechApi.task.findTaskByCode({
        code: taskCode!,
        projectId: projectId!,
      })

      // ТП-176: несоответствие формы = обрабатываемая ошибка запроса
      // (isError-фолбэк карточки), а не TypeError в рендере
      return mapTaskMinDTOToTaskCard(
        parseContract(taskDataSchema, response.data, 'task-by-code'),
      )
    },
    enabled: !!projectId && !!taskCode, // запрос только при наличии id и кода
    // ТП-185: известные данные из списков — мгновенный первый рендер карточки;
    // полные детали (описание) приезжают запросом в фон (stale-while-revalidate).
    placeholderData:
      projectId && taskCode
        ? findCachedTaskByCode(queryClient, projectId, taskCode)
        : undefined,
    // ТП-130 (F-002): для поиска задачи по коду 404 — нормальный терминальный
    // исход (задача удалена, напр. клик по старому уведомлению). Ретраить
    // бессмысленно — сразу показываем состояние «не найдена».
    retry: false,
  })

  return query
}
