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

  const defaultSprintId =
    (sprints || []).find((sprint) => sprint.isDefault)?.id || ''

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
