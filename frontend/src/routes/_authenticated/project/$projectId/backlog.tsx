import { createFileRoute } from '@tanstack/react-router'
import { BacklogPage } from '@/page/backlog/BacklogPage'

export const Route = createFileRoute(
  '/_authenticated/project/$projectId/backlog',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  return <BacklogPage projectId={projectId} />
}
