import { Box, Button, Stack } from '@mui/material'
import { CompactTaskForm } from '@/features/task/TaskForm/CompactTaskForm'
import { useEditTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { memo } from 'react'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { BackButton } from '@/features/navigation/BackButton'
import { useProjectData } from '@/features/project/query/useProjectData'
import { Loader } from '@/shared/ui/components/Loader'
import type { ITaskCard } from '@/entities/task/types'
import { Headline } from './styles'
import { formatDateDDMMYYYY } from '@/shared/utils/date'
import { useEditTask } from '@/features/task/mutation/useEditTask'
import { useDeleteTask } from '@/features/task/mutation/useDeleteTask'
import { useTaskByCode } from '@/features/task/query/useTaskByCode'
import { toast } from 'sonner'
import { TaskComments } from '@/features/task/TaskComments'
import { useNavigate } from '@tanstack/react-router'

export const EditTaskPage = memo(function EditTaskPageInner({
  code,
}: {
  code: string
}) {
  const { activeProject } = useProjectData()

  const taskByCodeQuery = useTaskByCode({
    projectId: activeProject?.id,
    taskCode: code,
  })

  return (
    <>
      <BackButton />

      {taskByCodeQuery.isLoading && <Loader isLoading={true} />}
      {taskByCodeQuery.data && <TaskPageForm task={taskByCodeQuery.data} />}
    </>
  )
})

function TaskPageForm({ task }: { task: ITaskCard }) {
  const { activeProject } = useProjectData()
  const form = useEditTaskForm({ task })
  const editTask = useEditTask()
  const deleteTask = useDeleteTask()
  const navigate = useNavigate()

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
    navigate({ to: '/main' })
  }

  return (
    <Stack mt={'10px'} maxWidth={560}>
      <Headline>{task.code}</Headline>
      <Stack mt={2}>
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
      </Stack>
      <Stack
        gap={'18px'}
        direction={'row'}
        width={'100%'}
        height={'42px'}
        mt={2}
      >
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

      {activeProject && <TaskComments projectId={activeProject.id} taskId={task.id} />}
    </Stack>
  )
}
