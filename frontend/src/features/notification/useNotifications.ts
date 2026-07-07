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

/**
 * ТП-179: список грузится фоном с тем же ритмом, что и счётчик (30с,
 * только активная вкладка — паттерн pollingConfig ТП-47), а не по клику —
 * открытие колокольчика показывает данные МГНОВЕННО из кэша, свежесть
 * поддерживает поллинг. Раньше запрос стартовал при открытии меню, и
 * пользователь ждал сеть на каждый клик.
 */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () =>
      workTechApi.notification.getNotifications().then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
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
