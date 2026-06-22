import { SPRINT_QUERY_KEY } from '@/features/sprint/query/constants'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useReorderColumn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      statusId,
      taskIds,
    }: {
      projectId: string
      statusId: number
      taskIds: string[]
    }) =>
      workTechApi.task.reorderColumn({
        projectId,
        data: { statusId, taskIds },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] })
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId, SPRINT_QUERY_KEY.withTasks],
      })
    },
  })
}
