import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; code: string }) =>
      workTechApi.project.createProject({ data }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['userProjects'] }),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) =>
      workTechApi.project.deleteProject({ projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProjects'] })
      queryClient.invalidateQueries({ queryKey: ['activeProject'] })
    },
  })
}
