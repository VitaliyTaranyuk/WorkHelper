import { useState } from 'react'
import { Box, Stack } from '@mui/material'
import { CreateTaskContent } from '@/features/task/CreateTaskContent'
import { useCreateTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'
import { uploadPendingAttachments } from '@/features/task/uploadPendingAttachments'

type CreateTaskDetailsProps = {
  projectId: string
  defaultSprintId: string
  /** Вызывается после успешного создания задачи. */
  onSuccess: () => void
}

/**
 * Представление создания задачи на отдельной странице (CreateTaskPage,
 * маршрут /task/create) — форма в fullMode + кнопка создания.
 */
export function CreateTaskDetails({
  projectId,
  defaultSprintId,
  onSuccess,
}: CreateTaskDetailsProps) {
  const form = useCreateTaskForm({ defaultSprintId })
  const createTask = useCreateTask()

  // Отложенные вложения (ТП-30): грузятся к задаче сразу после создания.
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const onSubmit = form.handleSubmit(async (formValues) => {
    try {
      const created = await createTask.mutateAsync({
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
        // Выбранная колонка доски (ТП-36); для Backlog-спринта поле обнулено
        ...(formValues.status != null ? { statusId: formValues.status } : {}),
      })

      // Вложения (ТП-30): задача уже создана, ошибки загрузки не отменяют её.
      await uploadPendingAttachments(projectId, created.data.id, pendingFiles)

      onSuccess()
    } catch {
      // toast already shown by useCreateTask onError
    }
  })

  return (
    <Stack maxWidth={960}>
      <CreateTaskContent
        onSubmit={onSubmit}
        form={form}
        pendingFiles={pendingFiles}
        onPendingFilesChange={setPendingFiles}
      />
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
