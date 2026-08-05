import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'
import type { ProcessStepRequest } from '@/shared/api/endpoint/processStepsApi'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import { notify as toast } from '@/shared/ui/notify'

/**
 * T-515 (ADR-021): этапы процесса задачи.
 *
 * Ключ содержит `projectId` — как у задач, спринтов и правил: у другого проекта другой
 * ключ, поэтому переключение проекта не подмешивает чужой процесс (урок T-500).
 */
export const processStepsKey = (projectId: string) =>
  ['processSteps', projectId] as const

export function useProcessSteps(projectId: string) {
  return useQuery({
    queryKey: processStepsKey(projectId),
    queryFn: () =>
      workTechApi.processStep.getProcessSteps({ projectId }).then((res) => res.data),
  })
}

function useInvalidate(projectId: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: processStepsKey(projectId) })
}

export function useCreateProcessStep(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (data: ProcessStepRequest) =>
      workTechApi.processStep.createProcessStep({ projectId, data }),
    onSuccess: () => void invalidate(),
    // Причина отказа приходит с сервера понятной (K-34): «этап A1 уже есть в
    // процессе проекта» пользователю полезнее общей фразы.
    onError: (error) => toast.error(message(error, 'Не удалось добавить этап')),
  })
}

export function useCreateDefaultProcessSteps(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: () =>
      workTechApi.processStep.createDefaultProcessSteps({ projectId }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(message(error, 'Не удалось завести процесс')),
  })
}

export function useMoveProcessStep(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ stepId, up }: { stepId: string; up: boolean }) =>
      workTechApi.processStep.moveProcessStep({ projectId, stepId, up }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(message(error, 'Не удалось переставить этап')),
  })
}

export function useDeleteProcessStep(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (stepId: string) =>
      workTechApi.processStep.deleteProcessStep({ projectId, stepId }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(message(error, 'Не удалось удалить этап')),
  })
}

function message(error: unknown, fallback: string): string {
  return extractGeneralError(error) ?? fallback
}
