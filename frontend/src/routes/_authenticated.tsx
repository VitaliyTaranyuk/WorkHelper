import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { RedirectPath } from '@/shared/type'
import { DashboardLayout } from '@/widget/DashboardLayout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
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
  component: () => {
    return (
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    )
  },
})
