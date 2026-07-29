import { useQuery } from '@tanstack/react-query'
import { workTechApiClient } from '@/shared/api/workTechHttpClient'

export type UserLookupItem = {
  id: string
  firstName: string
  lastName: string
  displayName: string
  username: string
}

/** Короче двух символов точного совпадения быть не может — запрос не уходит. */
const MIN_QUERY_LENGTH = 2

/**
 * Поиск пользователя для приглашения в проект — по **точному** username или
 * email (TD-028).
 *
 * Приглашать нужно тех, кого в проекте ещё нет, поэтому выборка шире проекта;
 * подстроковый поиск по всей базе превращал бы это в перечисляемый каталог
 * пользователей с email. Точное совпадение оставляет ровно рабочий сценарий
 * «пригласить известного человека» — как в Slack, Notion и Jira. Кого не
 * знаешь по имени, приглашается ссылкой (ТП-35).
 *
 * Email в ответе не приходит: приглашающий его и так ввёл.
 */
export function useUserLookup(query: string, projectId: string | undefined) {
  const q = (query ?? '').trim()
  return useQuery<UserLookupItem[]>({
    queryKey: ['userLookup', projectId, q],
    queryFn: () =>
      workTechApiClient<UserLookupItem[]>({
        method: 'GET',
        url: `/users/lookup?projectId=${encodeURIComponent(projectId ?? '')}&q=${encodeURIComponent(q)}`,
      }).then((r) => r.data ?? []),
    enabled: Boolean(projectId) && q.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  })
}
