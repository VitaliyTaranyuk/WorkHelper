import { createFileRoute } from '@tanstack/react-router'
import { TaskListPage } from '@/page/tasks/TaskListPage'

export const Route = createFileRoute(
  '/_authenticated/project/$projectId/sprint',
)({
  component: RouteComponent,
})

// ТП-50: клик по активному спринту показывает тот же «Список задач»,
// что и одноимённый раздел — единое отображение.
function RouteComponent() {
  const { projectId } = Route.useParams()

  return <TaskListPage projectId={projectId} />
}
