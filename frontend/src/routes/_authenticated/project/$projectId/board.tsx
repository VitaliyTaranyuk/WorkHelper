import { createFileRoute } from '@tanstack/react-router'
import { MainPage } from '@/page/main'

/**
 * T-518: доска получила проект в адресе — как «Список задач», спринт и
 * календарь. До этого `/main` был единственным разделом без проекта в URL:
 * ссылку на доску нельзя было передать (у получателя открывался его
 * собственный последний проект), а две вкладки с разными проектами были
 * невозможны — проект хранился на сервере одним полем на пользователя.
 */
export const Route = createFileRoute(
  '/_authenticated/project/$projectId/board',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  return <MainPage projectId={projectId} />
}
