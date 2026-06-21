import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useChangeProject() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ projectId }: { projectId: string }) =>
      workTechApi.project.getProjectData({ projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['sprints'],
      })
      queryClient.invalidateQueries({
        queryKey: ['tasks'],
      })
      queryClient.invalidateQueries({
        queryKey: ['activeProject'],
      })
    },
  })

  return mutation
}
