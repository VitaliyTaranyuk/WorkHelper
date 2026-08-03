import { mapProjectDtoToProjectInfo } from '@/entities/project/mapDTO'
import { workTechApi } from '@/shared/api/endpoint'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCurrentProjectStore } from '@/features/project/model/currentProjectStore'

function useUserProjects() {
  return useQuery({
    queryKey: ['userProjects'],
    queryFn: () =>
      workTechApi.project.getAllUserProjects().then((res) => res.data),
  })
}

/**
 * T-518: проект открытой страницы важнее серверного «последнего».
 *
 * Раньше единственным источником был `GET /projects/last`, то есть общее для
 * всех вкладок поле `user.last_project_id`: открытие бэклога другого проекта
 * уводило за собой доску, а две вкладки с разными проектами были невозможны.
 * Теперь адрес страницы решает, а серверное значение остаётся точкой входа —
 * «где я остановился» при заходе на `/main` и при следующем входе.
 */
function useActiveProjectId(userProjects: Array<{ id: string }>) {
  const projectIdFromRoute = useCurrentProjectStore((state) => state.projectId)

  const {
    data: activeProjectData,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: ['activeProject'],
    queryFn: () =>
      workTechApi.project.getActiveProject().then((res) => res.data),
    enabled: !projectIdFromRoute,
  })

  // Подставлять «первый проект» можно только ПОСЛЕ ответа сервера о последнем
  // открытом. Список проектов приезжает отдельным запросом и нередко быстрее —
  // без этого условия `/main` успевал увести в первый по алфавиту проект ещё
  // до того, как приходил правильный ответ. Гонка найдена живой проверкой на
  // проде с двумя проектами: при одном и том же состоянии сервера переход
  // открывал то нужный проект, то чужой.
  const fallbackAllowed = isFetched || Boolean(activeProjectData)

  const id =
    projectIdFromRoute ||
    activeProjectData?.id ||
    (fallbackAllowed ? userProjects[0]?.id : undefined)

  return {
    activeProjectId: id,
    isLoading: projectIdFromRoute ? false : isLoading,
  }
}

function useActiveProjectInfo(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projectData', projectId],
    queryFn: () =>
      projectId
        ? workTechApi.project
            .getProjectData({ projectId })
            .then((res) => res.data)
        : Promise.resolve(undefined),
    enabled: !!projectId, // делаем запрос только если есть id
  })
}

/**
 * Проект для точки входа `/main`, у которой проекта в адресе нет: контекст
 * вкладки → серверное «последнее место» → первый доступный проект (T-518).
 */
export function useEntryProjectId() {
  const userProjectsQuery = useUserProjects()
  const { activeProjectId, isLoading } = useActiveProjectId(
    userProjectsQuery.data ?? [],
  )
  return {
    projectId: activeProjectId,
    isLoading: isLoading || userProjectsQuery.isLoading,
  }
}

export function useProjectData() {
  const userProjectsQuery = useUserProjects()
  const activeProjectIdQuery = useActiveProjectId(userProjectsQuery.data ?? [])
  const activeProjectInfoQuery = useActiveProjectInfo(
    activeProjectIdQuery.activeProjectId,
  )

  const activeProject = useMemo(() => {
    if (!activeProjectInfoQuery.data) return null

    const mapped = mapProjectDtoToProjectInfo(activeProjectInfoQuery.data)

    // Завершающий статус — последняя ВИДИМАЯ колонка доски (как на бэкенде,
    // SprintsService.archiveDoneTasks). Скрытые статусы (Canceled, Backlog)
    // не могут быть завершающими: иначе Done-задачи считались незавершёнными.
    const boardStatuses = mapped.statuses.filter(
      (s) => s.viewed && !s.defaultTaskStatus,
    )
    const candidates =
      boardStatuses.length > 0 ? boardStatuses : mapped.statuses

    // TD-031: `reduce` без начального значения бросает TypeError на пустом
    // списке и роняет ВЕСЬ экран в ErrorBoundary. Пустой список приезжает не
    // только из проекта без колонок (его удержать некому было бы): mapDTO
    // превращает отсутствующее поле `statuses` в [], то есть достаточно
    // дрейфа контракта — фронтенд обязан деградировать, а не бросать (W-08).
    //
    // Отсутствие завершающей колонки — честное `undefined`, а не подставленный
    // статус: фиктивный дал бы «завершение» задачи в несуществующую колонку,
    // то есть ровно молчаливый отказ, который запрещает W-06.
    const resolveStatus = candidates.length
      ? candidates.reduce((acc, curStatus) =>
          acc.priority < curStatus.priority ? curStatus : acc,
        )
      : undefined

    return { ...mapped, resolveStatus }
  }, [activeProjectInfoQuery.data])

  return {
    userProjects: userProjectsQuery.data,
    activeProject,
    isLoading:
      userProjectsQuery.isLoading ||
      activeProjectInfoQuery.isLoading ||
      activeProjectIdQuery.isLoading,
  }
}
