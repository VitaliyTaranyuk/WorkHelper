import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useDeleteSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      sprintId,
    }: {
      projectId: string
      sprintId: string
    }) => workTechApi.sprint.deleteSprint({ projectId, sprintId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
