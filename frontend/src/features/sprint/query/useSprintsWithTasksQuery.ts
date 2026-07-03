import { useQuery } from '@tanstack/react-query'
import { mapSprintMinDtoToSprintMinWithTasks } from '@/entities/sprint/mapDTO'
import type { SprintMinWithTasks } from '@/entities/sprint/type'
import { workTechApi } from '@/shared/api/endpoint'
import { SPRINT_QUERY_KEY } from './constants'
import { LISTS_POLL_INTERVAL_MS } from '@/features/task/query/pollingConfig'

type SprintWithProject = SprintMinWithTasks & { projectId: string }

const fetchSprints = async (
  projectId: string,
): Promise<SprintWithProject[]> => {
  const sprintsResponse = await workTechApi.sprint.getALLSprints({ projectId })

  const preparedSprints: SprintWithProject[] = (
    sprintsResponse.data.sprints || []
  ).map((sprint) => ({
    ...mapSprintMinDtoToSprintMinWithTasks(sprint),
    projectId,
  }))

  return preparedSprints
}

export const useSprintsWithTasksQuery = (projectId: string | undefined) => {
  return useQuery<SprintWithProject[]>({
    queryKey: ['sprints', projectId, SPRINT_QUERY_KEY.withTasks],
    queryFn: () => fetchSprints(projectId as string),
    enabled: !!projectId, // не дергаем запрос, пока нет id
    // ТП-47: списки задач/спринтов подтягивают чужие изменения фоново
    refetchInterval: LISTS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })
}
