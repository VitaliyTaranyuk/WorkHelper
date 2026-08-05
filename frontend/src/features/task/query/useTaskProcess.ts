import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import { notify as toast } from '@/shared/ui/notify'

/**
 * T-516: размер задачи и её этап процесса.
 *
 * Ключ содержит и проект, и задачу: процесс принадлежит проекту, а размер — задаче,
 * поэтому запись одной задачи не должна сбрасывать кэш соседней.
 */
export const taskProcessKey = (projectId: string, taskId: string) =>
  ['taskProcess', projectId, taskId] as const

export function useTaskProcess(projectId: string, taskId: string) {
  return useQuery({
    queryKey: taskProcessKey(projectId, taskId),
    queryFn: () =>
      workTechApi.taskProcess.getTaskProcess({ projectId, taskId }).then((r) => r.data),
  })
}

function useApplyProcess(projectId: string, taskId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: taskProcessKey(projectId, taskId) })
    // Понижение размера пишется в историю задачи — вкладка «История» обязана это
    // показать сразу, иначе «фиксируется» осталось бы словом (K-44).
    void queryClient.invalidateQueries({ queryKey: ['taskHistory', projectId, taskId] })
  }
}

export function useSetTaskSize(projectId: string, taskId: string) {
  const apply = useApplyProcess(projectId, taskId)
  return useMutation({
    mutationFn: (size: string | null) =>
      workTechApi.taskProcess.setTaskSize({ projectId, taskId, size }),
    onSuccess: () => apply(),
    onError: (error) => toast.error(message(error, 'Не удалось изменить размер задачи')),
  })
}

export function useSetTaskProcessStep(projectId: string, taskId: string) {
  const apply = useApplyProcess(projectId, taskId)
  return useMutation({
    mutationFn: (stepId: string | null) =>
      workTechApi.taskProcess.setTaskProcessStep({ projectId, taskId, stepId }),
    onSuccess: () => apply(),
    onError: (error) => toast.error(message(error, 'Не удалось изменить этап')),
  })
}

function message(error: unknown, fallback: string): string {
  return extractGeneralError(error) ?? fallback
}
