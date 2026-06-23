import { useQuery } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'

/**
 * История изменений задачи. Backend уже отдаёт её через
 * GET /tasks/{projectId}/{taskId}/history.
 */
export function useTaskHistory({
  projectId,
  taskId,
}: {
  projectId: string | undefined
  taskId: string | undefined
}) {
  return useQuery({
    queryKey: ['taskHistory', projectId, taskId],
    queryFn: () =>
      workTechApi.task
        .getTaskHistory({
          projectId: projectId as string,
          taskId: taskId as string,
        })
        .then((res) => res.data),
    enabled: !!projectId && !!taskId,
  })
}
