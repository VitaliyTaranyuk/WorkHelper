import { createRouter } from '@tanstack/react-router'
import NiceModal from '@ebay/nice-modal-react'
import { routeTree } from '../routeTree.gen'
import { RouteErrorFallback } from './RouteErrorFallback'

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
  Wrap: ({ children }: { children: React.ReactNode }) => (
    <NiceModal.Provider>{children}</NiceModal.Provider>
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
