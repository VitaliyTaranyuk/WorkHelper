import type { SprintDtoRequest } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'

export function useCreateSprint() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      projectId,
      sprintData,
    }: {
      projectId: string
      sprintData: SprintDtoRequest
    }) =>
      workTechApi.sprint.createSprint({
        projectId,
        data: sprintData,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sprints', variables.projectId],
      })
      toast.success('Спринт создан')
    },
    onError: () => {
      toast.error('Не удалось создать спринт')
    },
  })

  return mutation
}
