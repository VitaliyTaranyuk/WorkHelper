import { createFileRoute } from '@tanstack/react-router'
import { EditTaskPage } from '@/page/task/EditTaskPage'

/**
 * G-4 (вторая половина T-518): канонический адрес задачи содержит проект.
 *
 * Раньше маршрут был `/task/$code`, а проект подставлялся «текущий», поэтому
 * одна и та же ссылка открывала у разных людей РАЗНЫЕ задачи — или 404, если
 * у получателя открыт другой проект. Бэкенд при этом всегда был корректен:
 * `GET /tasks/{projectId}/code/{code}` резолвит код в пределах проекта.
 */
export const Route = createFileRoute(
  '/_authenticated/project/$projectId/task/$code',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId, code } = Route.useParams()
  return <EditTaskPage projectId={projectId} code={code} />
}
