import { createFileRoute } from '@tanstack/react-router'
import { SprintListPage } from '@/page/sprint/SprintListPage'

export const Route = createFileRoute(
  '/_authenticated/project/$projectId/sprint',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()

  return <SprintListPage projectId={projectId} />
}
