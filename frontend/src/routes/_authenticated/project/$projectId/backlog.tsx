import { createFileRoute } from '@tanstack/react-router'
import { TaskListPage } from '@/page/tasks/TaskListPage'
import { useDeclareCurrentProject } from '@/features/project/model/currentProjectStore'

export const Route = createFileRoute(
  '/_authenticated/project/$projectId/backlog',
)({
  component: RouteComponent,
})

// ТП-50: «Список задач» — единый вид (все спринты + бэклог + завершённые);
// маршрут /backlog сохранён для старых ссылок и deep-link'ов.
function RouteComponent() {
  const { projectId } = Route.useParams()
  // T-518: проект страницы объявляется явно — сайдбар, карточка задачи и
  // остальные потребители читают его отсюда, а не из серверного «последнего».
  useDeclareCurrentProject(projectId)
  return <TaskListPage projectId={projectId} />
}
