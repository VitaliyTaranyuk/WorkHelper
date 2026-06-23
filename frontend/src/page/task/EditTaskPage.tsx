import { memo } from 'react'
import { Stack } from '@mui/material'
import { BackButton } from '@/features/navigation/BackButton'
import { useProjectData } from '@/features/project/query/useProjectData'
import { Loader } from '@/shared/ui/components/Loader'
import { Headline } from './styles'
import { useTaskByCode } from '@/features/task/query/useTaskByCode'
import { TaskCardContent } from '@/features/task/TaskCardContent'
import { useNavigate } from '@tanstack/react-router'
import type { ITaskCard } from '@/entities/task/types'

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
      {taskByCodeQuery.data && <TaskPageBody task={taskByCodeQuery.data} />}
    </>
  )
})

function TaskPageBody({ task }: { task: ITaskCard }) {
  const navigate = useNavigate()

  return (
    <Stack mt={'10px'}>
      <Headline>{task.code}</Headline>
      <Stack mt={2}>
        <TaskCardContent
          task={task}
          onDeleted={() => navigate({ to: '/main' })}
        />
      </Stack>
    </Stack>
  )
}
