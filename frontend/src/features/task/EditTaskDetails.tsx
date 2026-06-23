import { Box, Button, Stack } from '@mui/material'
import { CompactTaskForm } from '@/features/task/TaskForm/CompactTaskForm'
import { useEditTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { useProjectData } from '@/features/project/query/useProjectData'
import type { ITaskCard } from '@/entities/task/types'
import { formatDateDDMMYYYY } from '@/shared/utils/date'
import { useEditTask } from '@/features/task/mutation/useEditTask'
import { useDeleteTask } from '@/features/task/mutation/useDeleteTask'
import { TaskComments } from '@/features/task/TaskComments'
import { toast } from 'sonner'

type EditTaskDetailsProps = {
  task: ITaskCard
  /** Вызывается после успешного удаления задачи. */
  onDeleted?: () => void
}

/**
 * Полное (расширенное) представление задачи: форма в fullMode + удаление +
 * комментарии. Единая реализация, используется и на отдельной странице
 * (EditTaskPage, для прямых ссылок/уведомлений), и в большом модальном окне
 * (ExpandedTaskModal). Дублирования нет.
 */
export function EditTaskDetails({ task, onDeleted }: EditTaskDetailsProps) {
  const { activeProject } = useProjectData()
  const form = useEditTaskForm({ task })
  const editTask = useEditTask()
  const deleteTask = useDeleteTask()

  const onSubmit = form.handleSubmit(async (formValues) => {
    try {
      await editTask.mutateAsync({
        projectId: activeProject!.id,
        taskId: task.id,
        data: {
          priority: formValues.priority,
          taskType: formValues.type,
          title: formValues.taskTitle,
          sprintId: formValues.sprint,

          ...(formValues.assignee === '-1'
            ? {}
            : { assignee: formValues.assignee }),

          ...(formValues.estimation
            ? { estimation: formValues.estimation }
            : {}),

          ...(formValues.description
            ? { description: formValues.description }
            : {}),
        },
      })
      form.reset({ ...formValues })
    } catch {
      toast.error('Не удалось сохранить изменения')
    }
  })

  const onDelete = async () => {
    if (!activeProject) return
    if (!window.confirm(`Удалить задачу ${task.code}?`)) return
    await deleteTask.mutateAsync({ projectId: activeProject.id, taskId: task.id })
    onDeleted?.()
  }

  return (
    <Stack maxWidth={560}>
      <CompactTaskForm
        fullMode
        mode="edit"
        staticTaskInfo={{
          createdAt: formatDateDDMMYYYY(task.createdAt),
          creator: task.creator,
        }}
        onSubmit={onSubmit}
        form={form}
      />
      <Stack gap={'18px'} direction={'row'} width={'100%'} height={'42px'} mt={2}>
        <MUIPrimaryButton
          disabled={
            !form.formState.isValid ||
            !Object.keys(form.formState.dirtyFields).length
          }
          variant="contained"
          onClick={onSubmit}
          fullWidth
        >
          Сохранить
        </MUIPrimaryButton>
        <Button
          variant="outlined"
          color="error"
          fullWidth
          onClick={onDelete}
          disabled={deleteTask.isPending}
        >
          Удалить задачу
        </Button>
        <Box width={'100%'} />
      </Stack>

      {activeProject && (
        <TaskComments projectId={activeProject.id} taskId={task.id} />
      )}
    </Stack>
  )
}
