import type { SprintDtoRequest } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
    },
  })

  return mutation
}
