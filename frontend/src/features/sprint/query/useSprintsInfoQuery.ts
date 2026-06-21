import { useQuery } from '@tanstack/react-query'
import { mapSprintMinDtoToSprintMin } from '@/entities/sprint/mapDTO'
import type { SprintMin } from '@/entities/sprint/type'
import { workTechApi } from '@/shared/api/endpoint'

const fetchSprints = async (projectId: string): Promise<SprintMin[]> => {
  const sprintsResponse = await workTechApi.sprint.getALLSprintsInfo({
    projectId,
  })

  return (sprintsResponse.data.sprints || []).map(mapSprintMinDtoToSprintMin)
}

export const useSprintsInfoQuery = ({
  projectId,
  once,
}: {
  projectId: string | undefined
  once?: boolean
}) => {
  return useQuery<SprintMin[]>({
    queryKey: ['sprints', projectId],
    queryFn: () => fetchSprints(projectId as string),
    enabled: !!projectId, // не дергаем запрос, пока нет id
    ...(once ? { staleTime: Infinity } : {}),
  })
}
