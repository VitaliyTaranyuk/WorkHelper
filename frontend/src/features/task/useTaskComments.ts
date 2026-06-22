import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useTaskComments({
  projectId,
  taskId,
}: {
  projectId: string | undefined
  taskId: string | undefined
}) {
  return useQuery({
    queryKey: ['comments', projectId, taskId],
    queryFn: () =>
      workTechApi.task
        .getComments({ projectId: projectId!, taskId: taskId! })
        .then((r) => r.data),
    enabled: !!projectId && !!taskId,
  })
}

export function useCreateComment(projectId: string, taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (comment: string) =>
      workTechApi.task.createComment({ data: { projectId, taskId, comment } }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['comments', projectId, taskId],
      }),
  })
}

export function useDeleteComment(projectId: string, taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      workTechApi.task.deleteComment({ commentId, taskId, projectId }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['comments', projectId, taskId],
      }),
  })
}
