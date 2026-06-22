import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useFinishSprint() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      projectId,
      sprintId,
    }: {
      projectId: string
      sprintId: string
    }) =>
      workTechApi.sprint.finishSprint({
        projectId,
        sprintId,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId],
      })
      toast.success('Спринт завершён')
    },
    onError: () => {
      toast.error('Не удалось завершить спринт')
    },
  })

  return mutation
}
