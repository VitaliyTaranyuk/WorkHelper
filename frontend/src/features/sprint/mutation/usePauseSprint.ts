import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'

export function usePauseSprint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      sprintId,
    }: {
      projectId: string
      sprintId: string
    }) =>
      workTechApi.sprint.pauseSprint({
        projectId,
        sprintId,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['activeSprint', variables.projectId],
      })
      toast.success('Спринт приостановлен')
    },
    onError: () => {
      toast.error('Не удалось приостановить спринт')
    },
  })
}
