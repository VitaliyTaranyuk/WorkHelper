import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'

/**
 * Единственный экземпляр роутера (ТП-59). Вынесен из main.tsx, чтобы код вне
 * React-дерева RouterProvider (например, toast-action в мутациях или модалки
 * NiceModal — они монтируются ВНЕ RouterProvider, см. урок ТП-39/TD-015) мог
 * навигировать императивно: router.navigate({...}).
 */
export const router = createRouter({
  routeTree,
  context: {
    isAuthenticated: false,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
