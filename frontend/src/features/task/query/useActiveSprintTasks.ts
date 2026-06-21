import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import type { ITaskCard } from '@/entities/task/types'
import { workTechApi } from '@/shared/api/endpoint'
import { useQuery } from '@tanstack/react-query'
import { TASK_QUERY_KEY } from './constants'

export function useActiveSprintTasks({
  projectId,
}: {
  projectId: string | undefined
}) {
  const query = useQuery({
    queryKey: ['tasks', projectId, TASK_QUERY_KEY.activeSprint],
    queryFn: () => workTechApi.task.getUserProjectTasks(),
    select: (response): ITaskCard[] =>
      response.data.tasks
        ? response.data.tasks.map(mapTaskMinDTOToTaskCard)
        : [],
    enabled: !!projectId,
  })

  return query
}
