import { Stack } from '@mui/material'
import { CreateTaskButton } from '@/features/task/CreateTaskButton'
import { CreateSprintButton } from '@/features/sprint/CreateSprint'
import { useProjectData } from '@/features/project/query/useProjectData'
import { Loader } from '@/shared/ui/components/Loader'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'

export type HeaderActionType = 'createTask' | 'createSprint'

export type HeaderActionsProps = Partial<Record<HeaderActionType, boolean>>

export function HeaderActions({ actions }: { actions: HeaderActionsProps }) {
  const projectData = useProjectData()
  const sprintsInfoQuery = useSprintsInfoQuery({
    projectId: projectData.activeProject?.id,
    once: true,
  })

  if (projectData.isLoading || sprintsInfoQuery.isLoading)
    return <Loader isLoading={true} />

  // T-519: в Kanban-режиме проект спринтами не пользуется — кнопка «Создать спринт»
  // была бы мёртвым контролом (K-32). Незнакомое значение режима трактуется как
  // «спринты»: деградация к прежнему поведению, а не к исчезнувшей кнопке (W-08).
  const kanbanMode = projectData.activeProject?.boardMode === 'KANBAN'

  return (
    <Stack flexDirection={'row'} justifyContent="flex-end" gap={'20px'}>
      {actions.createSprint && !kanbanMode && <CreateSprintButton size="medium" />}
      {actions.createTask && <CreateTaskButton size="medium" />}
    </Stack>
  )
}
