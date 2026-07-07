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

  // ТП-201: плейсхолдер из кэша списков (ТП-185) без тела описания — форму
  // редактирования монтируем ТОЛЬКО на реальных данных, иначе описание пусто
  // и правки идут поверх невидимого текста.
  const fullTask = taskByCodeQuery.isPlaceholderData
    ? undefined
    : taskByCodeQuery.data

  return (
    <>
      <BackButton />

      {!fullTask && !taskByCodeQuery.isError && <Loader isLoading={true} />}
      {fullTask && <TaskPageBody task={fullTask} />}
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
