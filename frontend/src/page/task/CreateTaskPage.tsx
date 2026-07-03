import { memo } from 'react'
import { Stack } from '@mui/material'
import { BackButton } from '@/features/navigation/BackButton'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { useProjectData } from '@/features/project/query/useProjectData'
import { Loader } from '@/shared/ui/components/Loader'
import { useNavigate } from '@tanstack/react-router'
import { Headline } from './styles'
import { CreateTaskDetails } from '@/features/task/CreateTaskDetails'

export const CreateTaskPage = memo(function CreateTaskPageInner() {
  const { activeProject } = useProjectData()
  const { data: sprints } = useSprintsInfoQuery({
    projectId: activeProject?.id,
  })

  const navigate = useNavigate()

  const params = new URLSearchParams(window.location.search)
  const pageQueryRedirect = params.get('redirect')

  // Спринт по контексту (ТП-12): страница открыта из Backlog (redirect на
  // /backlog) — создаём в Backlog; иначе — в активный спринт, чтобы задача
  // сразу появилась на доске. Фоллбэк — Backlog-спринт.
  const backlogSprintId =
    (sprints || []).find((sprint) => sprint.isDefault)?.id || ''
  const activeSprintId =
    (sprints || []).find((sprint) => sprint.isActive)?.id || ''
  const isBacklogContext = (pageQueryRedirect || '').includes('/backlog')
  const defaultSprintId =
    (isBacklogContext ? backlogSprintId : activeSprintId) || backlogSprintId

  return (
    <>
      <BackButton />
      {!defaultSprintId || !activeProject ? (
        <Loader isLoading={true} />
      ) : (
        <Stack mt={'10px'} maxWidth={560}>
          <Headline>Создание задачи</Headline>
          <Stack mt={2}>
            <CreateTaskDetails
              projectId={activeProject.id}
              defaultSprintId={defaultSprintId}
              onSuccess={() => {
                navigate({ to: pageQueryRedirect || '/main' })
              }}
            />
          </Stack>
        </Stack>
      )}
    </>
  )
})
