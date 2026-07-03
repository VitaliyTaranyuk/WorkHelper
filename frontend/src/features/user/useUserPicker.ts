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
 * Единый источник для assignee picker / @mention / комментариев.
 * Идёт в backend GET /users/picker — доступен всем участникам проекта
 * (PROJECT_MEMBER+), отдаёт только активных, поиск по любому полю имени/login/email.
 */
export function useUserPicker(query: string) {
  const q = (query ?? '').trim()
  return useQuery<UserPickerItem[]>({
    queryKey: ['userPicker', q],
    queryFn: () =>
      workTechApiClient<UserPickerItem[]>({
        method: 'GET',
        url: `/users/picker?q=${encodeURIComponent(q)}&limit=20`,
      }).then((r) => r.data ?? []),
    staleTime: 30_000,
  })
}
