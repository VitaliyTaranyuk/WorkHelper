import { createFileRoute, redirect } from '@tanstack/react-router'
import type { RedirectPath } from '@/shared/type'
import { useAuthStore } from '@/features/auth/authStore'

// эта страница заглушка - а главная находится в main, чтобы было возможно ее положить в папку _authenticated
export const Route = createFileRoute('/')({
  loader: () => {
    throw redirect({
      to: '/main',
    })
  },
  beforeLoad: async ({ location }) => {
    // ТП-115: живой стор вместо lagging-context (см. _authenticated).
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          // чтобы после логина отправить пользователя на ту страницу, куда он хотел зайти
          redirect: location.href as RedirectPath,
        },
      })
    }
  },
})
