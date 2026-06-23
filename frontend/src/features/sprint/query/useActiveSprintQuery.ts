import { useQuery } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'
import type { SprintMin } from '@/entities/sprint/type'
import { mapSprintMinDtoToSprintMin } from '@/entities/sprint/mapDTO'

/**
 * Активный (текущий) спринт проекта для отображения в сайдбаре.
 * Если активного спринта нет, backend отвечает 404 — это нормальное состояние,
 * возвращаем null вместо ошибки.
 */
export const useActiveSprintQuery = (projectId: string | undefined) => {
  return useQuery<SprintMin | null>({
    queryKey: ['activeSprint', projectId],
    queryFn: async () => {
      try {
        const res = await workTechApi.sprint.getSprintInfo({
          projectId: projectId as string,
        })
        return res.data ? mapSprintMinDtoToSprintMin(res.data) : null
      } catch {
        return null
      }
    },
    enabled: !!projectId,
    retry: false,
  })
}
