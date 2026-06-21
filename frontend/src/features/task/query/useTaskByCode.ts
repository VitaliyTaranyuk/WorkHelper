import { mapTaskMinDTOToTaskCard } from '@/entities/task/mapDTO'
import { workTechApi } from '@/shared/api/endpoint'
import { useQuery } from '@tanstack/react-query'

export function useTaskByCode({
  projectId,
  taskCode,
}: {
  projectId: string | undefined
  taskCode: string
}) {
  const query = useQuery({
    queryKey: ['tasks', projectId, taskCode],
    queryFn: async () => {
      const response = await workTechApi.task.findTaskByCode({
        code: taskCode,
        projectId: projectId!,
      })

      return mapTaskMinDTOToTaskCard(response.data)
    },
    enabled: !!projectId, // делаем запрос только если есть id
  })

  return query
}
