import { createFileRoute } from '@tanstack/react-router'
import { CalendarPage } from '@/page/calendar/CalendarPage'

export const Route = createFileRoute(
  '/_authenticated/project/$projectId/calendar',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()

  return <CalendarPage projectId={projectId} />
}
