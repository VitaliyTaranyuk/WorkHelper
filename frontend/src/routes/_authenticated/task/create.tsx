import { createFileRoute } from '@tanstack/react-router'
import { CreateTaskPage } from '@/page/task/CreateTaskPage'
import type { RedirectPath } from '@/shared/type'

export const Route = createFileRoute('/_authenticated/task/create')({
  validateSearch: (search) => ({
    redirect: (search.redirect as RedirectPath) || undefined,
  }),
  component: CreateTaskPage,
})
