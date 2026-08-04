import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'
import type { RepoBindingRequest } from '@/shared/api/endpoint/repoBindingsApi'
import { notify as toast } from '@/shared/ui/notify'

/**
 * T-510: привязки репозиториев проекта.
 *
 * Ключ содержит `projectId` — как у задач и спринтов: у другого проекта другой
 * ключ, поэтому переключение проекта не подмешивает чужие данные (урок T-500).
 */
export const repoBindingsKey = (projectId: string | undefined) =>
  ['repoBindings', projectId] as const

export function useRepoBindings(projectId: string | undefined) {
  return useQuery({
    queryKey: repoBindingsKey(projectId),
    queryFn: () =>
      workTechApi.repoBinding
        .getRepoBindings({ projectId: projectId! })
        .then((res) => res.data),
    enabled: !!projectId,
  })
}

function useInvalidate(projectId: string | undefined) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: repoBindingsKey(projectId) })
}

export function useCreateRepoBinding(projectId: string | undefined) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (data: RepoBindingRequest) =>
      workTechApi.repoBinding.createRepoBinding({ projectId: projectId!, data }),
    onSuccess: () => void invalidate(),
    // Причина отказа приходит с сервера понятной (K-34) — показываем её, а не
    // общую фразу: «этот репозиторий уже привязан» пользователю полезнее.
    onError: (error) => toast.error(serverMessage(error, 'Не удалось привязать репозиторий')),
  })
}

export function useUpdateRepoBinding(projectId: string | undefined) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ bindingId, data }: { bindingId: string; data: RepoBindingRequest }) =>
      workTechApi.repoBinding.updateRepoBinding({ projectId: projectId!, bindingId, data }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(serverMessage(error, 'Не удалось изменить привязку')),
  })
}

export function useDeleteRepoBinding(projectId: string | undefined) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (bindingId: string) =>
      workTechApi.repoBinding.deleteRepoBinding({ projectId: projectId!, bindingId }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(serverMessage(error, 'Не удалось убрать привязку')),
  })
}

function serverMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}
