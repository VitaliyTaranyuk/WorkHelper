import { Box, Stack } from '@mui/material'
import { CompactTaskForm } from '@/features/task/TaskForm/CompactTaskForm'
import { useCreateTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'

type CreateTaskDetailsProps = {
  projectId: string
  defaultSprintId: string
  /** Вызывается после успешного создания задачи. */
  onSuccess: () => void
}

/**
 * Полное (расширенное) представление создания задачи: форма в fullMode + кнопка
 * создания. Единая реализация для отдельной страницы (CreateTaskPage) и большого
 * модального окна (ExpandedTaskModal).
 */
export function CreateTaskDetails({
  projectId,
  defaultSprintId,
  onSuccess,
}: CreateTaskDetailsProps) {
  const form = useCreateTaskForm({ defaultSprintId })
  const createTask = useCreateTask()

  const onSubmit = form.handleSubmit(async (formValues) => {
    try {
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
    } catch {
      // toast already shown by useCreateTask onError
    }
  })

  return (
    <Stack maxWidth={560}>
      <CompactTaskForm fullMode mode="create" onSubmit={onSubmit} form={form} />
      <Stack gap={'18px'} direction={'row'} width={'100%'} height={'42px'} mt={2}>
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
