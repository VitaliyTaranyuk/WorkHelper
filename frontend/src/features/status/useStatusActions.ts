import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type StatusReq = {
  id: number
  priority: number
  code: string
  description?: string
  viewed: boolean
  defaultTaskStatus: boolean
}

export function useCreateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      code,
      priority,
    }: {
      projectId: string
      code: string
      priority: number
    }) =>
      workTechApi.status.createStatus({
        projectId,
        data: {
          code,
          description: code,
          priority,
          viewed: true,
          defaultTaskStatus: false,
        },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['projectData'] }),
  })
}

export function useDeleteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      statusId,
    }: {
      projectId: string
      statusId: number
    }) => workTechApi.status.deleteStatus({ projectId, statusId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectData'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateStatuses() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      statuses,
    }: {
      projectId: string
      statuses: StatusReq[]
    }) => workTechApi.status.updateStatuses({ projectId, data: { statuses } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['projectData'] }),
  })
}
