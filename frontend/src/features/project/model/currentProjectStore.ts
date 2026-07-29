import { useEffect } from 'react'
import { create } from 'zustand'

interface CurrentProjectState {
  /** Проект из адреса открытой страницы; null — адрес проекта не содержит. */
  projectId: string | null
  setProjectId: (projectId: string | null) => void
}

/**
 * Шов «какой проект открыт» между маршрутом и данными (T-518).
 *
 * <p>Проект живёт в URL, но прочитать его хуком роутера там, где он нужен,
 * нельзя: `useProjectData` вызывают в том числе компоненты NiceModal-модалок,
 * которые монтируются ВНЕ Router-контекста, и router-хук уронил бы всё дерево
 * белым экраном (**R-02**, прод-инцидент ТП-172). Поэтому маршруты кладут
 * `projectId` сюда, а потребители читают отсюда.
 *
 * <p>Стор живёт во вкладке, поэтому две вкладки с разными проектами больше не
 * мешают друг другу: раньше «текущий проект» был общим серверным полем.
 */
export const useCurrentProjectStore = create<CurrentProjectState>((set) => ({
  projectId: null,
  setProjectId: (projectId) =>
    set((state) => (state.projectId === projectId ? state : { projectId })),
}))

/**
 * Объявить проект открытой страницы. Вызывается компонентами маршрутов
 * `/project/$projectId/*` — единственное место, где известен проект из адреса.
 */
export function useDeclareCurrentProject(projectId: string | undefined) {
  const setProjectId = useCurrentProjectStore((state) => state.setProjectId)

  useEffect(() => {
    if (projectId) setProjectId(projectId)
  }, [projectId, setProjectId])
}
