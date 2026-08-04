import { createFileRoute } from '@tanstack/react-router'
import { ProjectSettingsPage } from '@/page/project-settings/ProjectSettingsPage'

/**
 * T-510: настройки проекта живут по адресу проекта, рядом с
 * `board`/`backlog`/`sprint`/`calendar`. Глобальный `/settings` остаётся
 * настройками пользователя — это другой скоуп.
 */
export const Route = createFileRoute(
  '/_authenticated/project/$projectId/settings',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  return <ProjectSettingsPage projectId={projectId} />
}
