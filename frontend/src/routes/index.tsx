import { createFileRoute, redirect } from '@tanstack/react-router'
import type { RedirectPath } from '@/shared/type'

// эта страница заглушка - а главная находится в main, чтобы было возможно ее положить в папку _authenticated
export const Route = createFileRoute('/')({
  loader: () => {
    throw redirect({
      to: '/main',
    })
  },
  beforeLoad: async ({ location, context }) => {
    if (!context.isAuthenticated) {
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
