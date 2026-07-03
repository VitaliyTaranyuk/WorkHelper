import { createFileRoute } from '@tanstack/react-router'
import { TaskListPage } from '@/page/tasks/TaskListPage'

export const Route = createFileRoute(
  '/_authenticated/project/$projectId/backlog',
)({
  component: RouteComponent,
})

// ТП-50: «Список задач» — единый вид (все спринты + бэклог + завершённые);
// маршрут /backlog сохранён для старых ссылок и deep-link'ов.
function RouteComponent() {
  const { projectId } = Route.useParams()
  return <TaskListPage projectId={projectId} />
}
