import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthPage } from '@/page/auth'
import { useAuthStore } from '@/features/auth/authStore'

export const Route = createFileRoute('/_auth')({
  validateSearch: (search?: { redirect?: string }): { redirect?: string } => ({
    redirect: search?.redirect,
  }),
  beforeLoad: ({ search }) => {
    // ТП-115: живой стор вместо lagging-context (см. _authenticated).
    if (useAuthStore.getState().isAuthenticated) {
      const target = search.redirect ?? '/main'
      throw redirect({ to: target })
    }
  },
  component: PageComponent,
})

function PageComponent() {
  const { redirect } = Route.useSearch()

  return <AuthPage redirect={redirect ?? '/main'} />
}
