import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      code: string
      /** T-512: скопировать правила этого проекта в новый. Необязательно. */
      donorProjectId?: string
    }) => workTechApi.project.createProject({ data }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['userProjects'] }),
  })
}

/**
 * T-519: переключение режима доски. Инвалидируются и данные проекта, и доска — от режима
 * зависит, какие задачи она показывает, и оставить старый ответ в кэше значило бы показать
 * доску прежнего режима как новую.
 */
export function useSetBoardMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      boardMode,
    }: {
      projectId: string
      boardMode: string
    }) => workTechApi.project.setBoardMode({ projectId, boardMode }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['projectData', projectId] })
      queryClient.invalidateQueries({ queryKey: ['userProjects'] })
      // Доска и спринты проекта: от режима зависит, какие задачи она показывает.
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['activeSprint', projectId] })
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string
      data: { name: string; description?: string; code: string }
    }) => workTechApi.project.updateProject({ projectId, data }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['userProjects'] })
      queryClient.invalidateQueries({ queryKey: ['projectData', projectId] })
    },
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
