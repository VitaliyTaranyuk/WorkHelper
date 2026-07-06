import { createRouter } from '@tanstack/react-router'
import NiceModal from '@ebay/nice-modal-react'
import { routeTree } from '../routeTree.gen'
import { RouteErrorFallback } from './RouteErrorFallback'
import { Loader } from '@/shared/ui/components/Loader'

/**
 * Единственный экземпляр роутера (ТП-59). Вынесен из main.tsx, чтобы код вне
 * React-дерева RouterProvider (например, toast-action в мутациях) мог
 * навигировать императивно: router.navigate({...}).
 *
 * ТП-131 (TD-015): `NiceModal.Provider` смонтирован через `Wrap` — ВНУТРИ
 * дерева роутера, поэтому router-хуки и <Link> в модалках работают (раньше
 * Provider жил в main.tsx вне RouterProvider → белый экран, BUG ТП-39).
 * `defaultErrorComponent` — корневой восстановимый экран вместо падения всего
 * приложения при краше рендера маршрута.
 */
export const router = createRouter({
  routeTree,
  context: {
    isAuthenticated: false,
  },
  defaultErrorComponent: RouteErrorFallback,
  // ТП-140 (F-005): при переходе между разделами код-сплит чанк маршрута
  // может грузиться заметное время — раньше 1–2 секунды висел контент
  // предыдущей страницы без всякой индикации, затем экран менялся скачком.
  // Порог 300мс отсекает мерцание на быстрых переходах; минимум 200мс —
  // чтобы уже показанный индикатор не «мигал».
  defaultPendingComponent: () => <Loader isLoading />,
  defaultPendingMs: 300,
  defaultPendingMinMs: 200,
  Wrap: ({ children }: { children: React.ReactNode }) => (
    <NiceModal.Provider>{children}</NiceModal.Provider>
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
