import { useQuery } from '@tanstack/react-query'
import { workTechApiClient } from '@/shared/api/workTechHttpClient'

export type UserPickerItem = {
  id: string
  firstName: string
  lastName: string
  displayName: string
  username: string
  email: string
}

/**
 * Участники проекта для @mention в комментариях.
 *
 * TD-028: раньше хук ходил в `/users/picker` без проекта и получал ВСЕХ
 * пользователей системы вместе с email — то есть предлагал упомянуть тех,
 * кому проект недоступен, и заодно раздавал чужие ПДн. Проект теперь
 * обязателен; пока он неизвестен, запрос не уходит вовсе (`enabled`), а не
 * летит с пустым параметром.
 */
export function useUserPicker(query: string, projectId: string | undefined) {
  const q = (query ?? '').trim()
  return useQuery<UserPickerItem[]>({
    queryKey: ['userPicker', projectId, q],
    queryFn: () =>
      workTechApiClient<UserPickerItem[]>({
        method: 'GET',
        url: `/users/picker?projectId=${encodeURIComponent(projectId ?? '')}&q=${encodeURIComponent(q)}&limit=20`,
      }).then((r) => r.data ?? []),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  })
}
