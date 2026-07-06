import { useState } from 'react'
import { Box, Stack } from '@mui/material'
import { CreateTaskContent } from '@/features/task/CreateTaskContent'
import { useCreateTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'
import { buildCreateTaskPayload } from '@/features/task/prepareTaskCard'
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
      // ТП-147: единая подготовка карточки (авто-название из описания) и
      // сборка payload — общий сервис всех точек создания.
      const created = await createTask.mutateAsync(
        buildCreateTaskPayload(formValues, projectId),
      )

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
        {/* ТП-136 (F-008): не блокируем по !isValid — клик по пустой форме
            должен показывать ошибку у поля, а не молча игнорироваться. */}
        <MUIPrimaryButton
          disabled={form.formState.isSubmitting}
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
