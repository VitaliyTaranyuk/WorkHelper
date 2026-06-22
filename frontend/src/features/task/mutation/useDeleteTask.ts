import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      taskId,
    }: {
      projectId: string
      taskId: string
    }) => workTechApi.task.deleteTask({ projectId, taskId }),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] }),
  })
}
