import { mapProjectDtoToProjectInfo } from '@/entities/project/mapDTO'
import { workTechApi } from '@/shared/api/endpoint'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

function useUserProjects() {
  return useQuery({
    queryKey: ['userProjects'],
    queryFn: () =>
      workTechApi.project.getAllUserProjects().then((res) => res.data),
  })
}

function useActiveProjectId(userProjects: Array<{ id: string }>) {
  const { data: activeProjectData, isLoading } = useQuery({
    queryKey: ['activeProject'],
    queryFn: () =>
      workTechApi.project.getActiveProject().then((res) => res.data),
  })

  const id = activeProjectData?.id || userProjects[0]?.id
  return { activeProjectId: id, isLoading }
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
    const resolveStatus = (
      boardStatuses.length > 0 ? boardStatuses : mapped.statuses
    ).reduce((acc, curStatus) =>
      acc.priority < curStatus.priority ? curStatus : acc,
    )

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
