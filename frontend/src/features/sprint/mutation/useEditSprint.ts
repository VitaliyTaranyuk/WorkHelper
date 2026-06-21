import type { SprintDtoRequest } from '@/data-contracts'
import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
    },
  })

  return mutation
}
