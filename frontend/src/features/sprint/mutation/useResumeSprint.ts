import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useResumeSprint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      sprintId,
    }: {
      projectId: string
      sprintId: string
    }) =>
      workTechApi.sprint.resumeSprint({
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
      toast.success('Спринт возобновлён')
    },
    onError: () => {
      toast.error('Не удалось возобновить спринт')
    },
  })
}
