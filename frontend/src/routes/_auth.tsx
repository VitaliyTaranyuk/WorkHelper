import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthPage } from '@/page/auth'

export const Route = createFileRoute('/_auth')({
  validateSearch: (search?: { redirect?: string }): { redirect?: string } => ({
    redirect: search?.redirect,
  }),
  beforeLoad: ({ context, search }) => {
    // если залогинен, то отправляем его либо на главную, либо туда куда хотел зайти
    if (context.isAuthenticated) {
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
