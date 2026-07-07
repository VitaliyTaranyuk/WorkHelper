import { workTechApi } from '@/shared/api/endpoint'
import type { NotificationDto } from '@/shared/api/endpoint/notificationsApi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const LIST_KEY = ['notifications', 'list'] as const

/**
 * ТП-179: список грузится фоном с тем же ритмом, что и счётчик (30с,
 * только активная вкладка — паттерн pollingConfig ТП-47), а не по клику —
 * открытие колокольчика показывает данные МГНОВЕННО из кэша, свежесть
 * поддерживает поллинг. Раньше запрос стартовал при открытии меню, и
 * пользователь ждал сеть на каждый клик.
 */
export function useNotifications() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () =>
      workTechApi.notification.getNotifications().then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

/**
 * ТП-184: бейдж непрочитанных — ПРОИЗВОДНОЕ от списка, а не отдельный
 * серверный счётчик. Раньше были два источника истины (getUnreadCount +
 * флаги read в списке), и при пометке прочитанным они рассинхронивались
 * («счётчик 0, а в списке непрочитанные»). Теперь и бейдж, и вид элемента
 * читаются из одних данных — рассинхрон невозможен по построению.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () =>
      workTechApi.notification.getNotifications().then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    select: (list: NotificationDto[]) => list.filter((n) => !n.read).length,
  })
}

/**
 * Оптимистичная пометка прочитанным (ТП-184): элемент мгновенно становится
 * read=true в кэше списка — бейдж (производный) сразу уменьшается ровно на
 * него, вид элемента меняется без ожидания сети. При сбое — откат к
 * прежнему списку; в конце — сверка с сервером.
 */
export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workTechApi.notification.markRead({ id }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY })
      const previous = queryClient.getQueryData<NotificationDto[]>(LIST_KEY)
      queryClient.setQueryData<NotificationDto[]>(LIST_KEY, (list) =>
        list?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(LIST_KEY, context.previous)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

/** Оптимистичная пометка всех прочитанными (ТП-184): бейдж обнуляется сразу. */
export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => workTechApi.notification.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY })
      const previous = queryClient.getQueryData<NotificationDto[]>(LIST_KEY)
      queryClient.setQueryData<NotificationDto[]>(LIST_KEY, (list) =>
        list?.map((n) => (n.read ? n : { ...n, read: true })),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(LIST_KEY, context.previous)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
