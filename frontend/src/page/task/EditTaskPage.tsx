import { Box, Stack } from '@mui/material'
import { CompactTaskForm } from '@/features/task/TaskForm/CompactTaskForm'
import { useEditTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { memo } from 'react'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { BackButton } from '@/features/navigation/BackButton'
import { useProjectData } from '@/features/project/query/useProjectData'
import { Loader } from '@/shared/ui/components/Loader'
import type { ITaskCard } from '@/entities/task/types'
import { Headline } from './styles'
import { formatToLocaleDate } from '@/shared/utils/date'
import { useEditTask } from '@/features/task/mutation/useEditTask'
import { useTaskByCode } from '@/features/task/query/useTaskByCode'

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
    } catch (e) {
      // здесь показыаем тосты об ошибке
      console.log(e)
    }
  })

  return (
    <Stack mt={'10px'} maxWidth={510}>
      <Headline>{task.code}</Headline>
      <Stack mt={2}>
        <CompactTaskForm
          fullMode
          mode="edit"
          staticTaskInfo={{
            createdAt: formatToLocaleDate({ date: task.createdAt }),
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
        <Box width={'100%'} />
      </Stack>
    </Stack>
  )
}
