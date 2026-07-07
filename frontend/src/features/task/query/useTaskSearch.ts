import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'

/** Поиск активируется от 2 символов — совпадает с порогом бэкенда (ТП-188). */
export const SEARCH_MIN_LENGTH = 2
const DEBOUNCE_MS = 250

/**
 * ТП-188: серверный поиск задач по коду/названию/ОПИСАНИЮ. Возвращает
 * множество id совпавших задач — список задач подсвечивает их в уже
 * загруженном сгруппированном виде (тела описаний не грузятся, ТП-187).
 *
 * Запрос дебаунсится (250мс) и кэшируется по (projectId, q); клиентский
 * фильтр по коду/названию работает МГНОВЕННО и без сети, а этот хук
 * добавляет к нему совпадения по описанию по мере готовности ответа.
 */
export function useTaskSearch(projectId: string, query: string) {
  const trimmed = query.trim()
  // Дебаунс всегда применяется (в т.ч. к первому вводу): стартуем с пустого.
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(trimmed), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [trimmed])

  const enabled = debounced.length >= SEARCH_MIN_LENGTH

  const query$ = useQuery({
    queryKey: ['tasks', projectId, 'search', debounced.toLowerCase()],
    queryFn: () =>
      workTechApi.task
        .searchTasks({ projectId, q: debounced })
        .then((r) => r.data),
    enabled,
    staleTime: 10_000,
  })

  return {
    /** id совпавших задач (по коду/названию/описанию); пусто, пока не готово. */
    matchedIds: enabled ? (query$.data ?? undefined) : undefined,
    isSearching: enabled && query$.isFetching,
  }
}
