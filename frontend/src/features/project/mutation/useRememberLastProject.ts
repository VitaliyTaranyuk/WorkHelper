import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'

/**
 * Запомнить проект, в котором работает пользователь (T-518).
 *
 * Раньше это делал побочный эффект обычного `GET /projects/{id}`: любое
 * чтение данных проекта переключало рабочий контекст глобально. Теперь запись
 * происходит там, где у неё есть смысл, — на доске проекта, и ровно один раз
 * на проект: следующий вход и `/main` откроются здесь же.
 *
 * Неудача не показывается пользователю: не запомнить место — не поломка
 * сценария, а деградация удобства (**W-06**: безопасный дефолт). В консоль
 * предупреждение уходит, в мониторинг — через общий обработчик.
 */
export function useRememberLastProject(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const rememberedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!projectId || rememberedRef.current === projectId) return
    rememberedRef.current = projectId

    workTechApi.project
      .rememberLastProject({ projectId })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['activeProject'] })
      })
      .catch((error: unknown) => {
        rememberedRef.current = null
        console.warn('Не удалось запомнить текущий проект', error)
      })
  }, [projectId, queryClient])
}
