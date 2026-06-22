import { workTechApi } from '@/shared/api/endpoint'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () =>
      workTechApi.notification.getUnreadCount().then((r) => r.data.count),
    refetchInterval: 30000,
  })
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () =>
      workTechApi.notification.getNotifications().then((r) => r.data),
    enabled,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workTechApi.notification.markRead({ id }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => workTechApi.notification.markAllRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
