import { createFileRoute } from '@tanstack/react-router'
import { CalendarPage } from '@/page/calendar/CalendarPage'

type CalendarSearch = {
  meetingId?: string
}

export const Route = createFileRoute(
  '/_authenticated/project/$projectId/calendar',
)({
  validateSearch: (search: Record<string, unknown>): CalendarSearch => ({
    meetingId:
      typeof search.meetingId === 'string' ? search.meetingId : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const { meetingId } = Route.useSearch()

  return <CalendarPage projectId={projectId} focusMeetingId={meetingId} />
}
