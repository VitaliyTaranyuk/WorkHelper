import type { SprintDtoRequest } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useEditSprint({
  projectId,
  sprintId,
}: {
  projectId: string
  sprintId: string
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (sprintData: SprintDtoRequest) =>
      workTechApi.sprint.updateSprint({
        data: sprintData,
        projectId,
        sprintId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['sprints', projectId],
      })
      toast.success('Спринт обновлён')
    },
    onError: () => {
      toast.error('Не удалось обновить спринт')
    },
  })

  return mutation
}
