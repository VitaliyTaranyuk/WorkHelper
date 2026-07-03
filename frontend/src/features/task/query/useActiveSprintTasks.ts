import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import type { ITaskCard } from '@/entities/task/types'
import { workTechApi } from '@/shared/api/endpoint'
import { useQuery } from '@tanstack/react-query'
import { TASK_QUERY_KEY } from './constants'
import { BOARD_POLL_INTERVAL_MS } from './pollingConfig'

export function useActiveSprintTasks({
  projectId,
}: {
  projectId: string | undefined
}) {
  const query = useQuery({
    queryKey: ['tasks', projectId, TASK_QUERY_KEY.activeSprint],
    // /tasks/tasks-in-project — рабочий эндпоинт (возвращает задачи проекта,
    // сгруппированные по исполнителям); разворачиваем в плоский список карточек.
    queryFn: () => workTechApi.task.getTasksInProject(),
    select: (response): ITaskCard[] =>
      (response.data ?? [])
        .flatMap((group) => group.tasks ?? [])
        .map(mapTaskMinDTOToTaskCard),
    enabled: !!projectId,
    // ТП-47: доска сама подтягивает изменения других пользователей —
    // фоновый поллинг + refetch при возврате на вкладку (дефолт TanStack).
    refetchInterval: BOARD_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })

  return query
}
