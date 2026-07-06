import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import { workTechApi } from '@/shared/api/endpoint'
import { useQuery } from '@tanstack/react-query'

export function useTaskByCode({
  projectId,
  taskCode,
}: {
  projectId: string | undefined
  // ТП-89: код опционален — карточка-модалка может открываться и по объекту
  // задачи (с доски/списка), тогда загрузка по коду не нужна.
  taskCode: string | undefined
}) {
  const query = useQuery({
    queryKey: ['tasks', projectId, taskCode],
    queryFn: async () => {
      const response = await workTechApi.task.findTaskByCode({
        code: taskCode!,
        projectId: projectId!,
      })

      return mapTaskMinDTOToTaskCard(response.data)
    },
    enabled: !!projectId && !!taskCode, // запрос только при наличии id и кода
    // ТП-130 (F-002): для поиска задачи по коду 404 — нормальный терминальный
    // исход (задача удалена, напр. клик по старому уведомлению). Ретраить
    // бессмысленно — сразу показываем состояние «не найдена».
    retry: false,
  })

  return query
}
