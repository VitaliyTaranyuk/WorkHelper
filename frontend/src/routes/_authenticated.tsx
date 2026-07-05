import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { RedirectPath } from '@/shared/type'
import { DashboardLayout } from '@/widget/DashboardLayout'
import { useAuthStore } from '@/features/auth/authStore'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    // ТП-115: читаем ЖИВОЙ стор (getState), а не context из RouterProvider —
    // context обновляется на ре-рендере InnerApp, который наступает ПОСЛЕ
    // синхронного navigate после login, поэтому первый вход «терялся» (нужен
    // был второй клик). Стор меняется синхронно в login() до navigate.
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
  component: () => {
    return (
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    )
  },
})
