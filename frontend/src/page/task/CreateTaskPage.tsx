import { Box, Stack } from '@mui/material'
import { CompactTaskForm } from '@/features/task/TaskForm/CompactTaskForm'
import { useCreateTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { memo } from 'react'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { BackButton } from '@/features/navigation/BackButton'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { useProjectData } from '@/features/project/query/useProjectData'
import { Loader } from '@/shared/ui/components/Loader'
import { useNavigate } from '@tanstack/react-router'
import { Headline } from './styles'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'

export const CreateTaskPage = memo(function CreateTaskPageInner() {
  const { activeProject } = useProjectData()
  const { data: sprints } = useSprintsInfoQuery({
    projectId: activeProject?.id,
  })

  const navigate = useNavigate()

  const params = new URLSearchParams(window.location.search)
  const pageQueryRedirect = params.get('redirect')

  // TODO: переделать, когда добавят ручку получения всех спринтов проекта
  const defaultSprintId =
    (sprints || []).find((sprint) => sprint.isDefault)?.id || ''

  return (
    <>
      <BackButton />
      {!defaultSprintId || !activeProject ? (
        <Loader isLoading={true} />
      ) : (
        <CreateTaskForm
          projectId={activeProject.id}
          defaultSprintId={defaultSprintId}
          onSuccess={() => {
            navigate({ to: pageQueryRedirect || '/main' })
          }}
        />
      )}
    </>
  )
})

function CreateTaskForm({
  projectId,
  defaultSprintId,
  onSuccess,
}: {
  projectId: string
  defaultSprintId: string
  onSuccess: () => void
}) {
  const form = useCreateTaskForm({
    defaultSprintId,
  })

  const createTask = useCreateTask()

  const onSubmit = form.handleSubmit(async (formValues) => {
    await createTask.mutateAsync({
      priority: formValues.priority,
      projectId,
      taskType: formValues.type,
      title: formValues.taskTitle,
      sprintId: formValues.sprint,

      ...(formValues.assignee === '-1'
        ? {}
        : { assignee: formValues.assignee }),

      ...(formValues.estimation ? { estimation: formValues.estimation } : {}),

      ...(formValues.description
        ? { description: formValues.description }
        : {}),
    })

    onSuccess()
  })

  return (
    <Stack mt={'10px'} maxWidth={510}>
      <Headline>Создание задачи</Headline>
      <Stack mt={2}>
        <CompactTaskForm
          fullMode
          mode="create"
          onSubmit={onSubmit}
          form={form}
        />
      </Stack>
      <Stack
        gap={'18px'}
        direction={'row'}
        width={'100%'}
        height={'42px'}
        mt={2}
      >
        <MUIPrimaryButton
          disabled={!form.formState.isValid || form.formState.isSubmitting}
          variant="contained"
          onClick={onSubmit}
          fullWidth
        >
          Создать
        </MUIPrimaryButton>
        <Box width={'100%'} />
      </Stack>
    </Stack>
  )
}
