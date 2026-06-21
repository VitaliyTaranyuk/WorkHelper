import { createFileRoute } from '@tanstack/react-router'
import { EditTaskPage } from '@/page/task/EditTaskPage'

export const Route = createFileRoute('/_authenticated/task/$code')({
  component: RouteComponent,
})

function RouteComponent() {
  const { code } = Route.useParams()

  return <EditTaskPage code={code} />
}
