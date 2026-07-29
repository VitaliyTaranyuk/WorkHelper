import { createFileRoute } from '@tanstack/react-router'
import { CalendarPage } from '@/page/calendar/CalendarPage'
import { useDeclareCurrentProject } from '@/features/project/model/currentProjectStore'

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
  useDeclareCurrentProject(projectId) // T-518

  return <CalendarPage projectId={projectId} focusMeetingId={meetingId} />
}
