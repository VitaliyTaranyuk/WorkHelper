import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'

export function useActivateSprint() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      projectId,
      sprintId,
    }: {
      projectId: string
      sprintId: string
    }) =>
      workTechApi.sprint.activateSprint({
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
      queryClient.invalidateQueries({
        queryKey: ['activeSprint', variables.projectId],
      })
      toast.success('Спринт запущен')
    },
    onError: () => {
      toast.error('Не удалось запустить спринт')
    },
  })

  return mutation
}
