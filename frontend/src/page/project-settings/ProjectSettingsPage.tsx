import { memo } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useDeclareCurrentProject } from '@/features/project/model/currentProjectStore'
import { useProjectData } from '@/features/project/query/useProjectData'
import { RepoBindingsSection } from '@/features/project/RepoBindingsSection'
import { BoardModeSection } from '@/features/project/BoardModeSection'
import { RuleSetsSection } from '@/features/rules/RuleSetsSection'
import { ProcessStepsSection } from '@/features/rules/ProcessStepsSection'
import { AgentsExportSection } from '@/features/rules/AgentsExportSection'

/**
 * Настройки проекта (фаза 5).
 *
 * Отдельный раздел, а не вкладка глобальных настроек: у `/settings` другой
 * скоуп — тема, голос, данные пользователя. Проектные настройки принадлежат
 * проекту и живут по его адресу, как доска и бэклог (ADR-026).
 *
 * Здесь живут режим доски (T-519), репозитории (T-510), правила проекта (T-511),
 * процесс задачи (T-515) и выгрузка `AGENTS.md` (T-514) — раздел заводился под
 * них, а не только под репозитории.
 */
export const ProjectSettingsPage = memo(function ProjectSettingsPageInner({
  projectId,
}: {
  projectId: string
}) {
  useDeclareCurrentProject(projectId)
  const { activeProject } = useProjectData()

  return (
    <Stack sx={{ maxWidth: 900 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Настройки проекта
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {activeProject?.name ?? 'Загрузка…'}
      </Typography>

      <Stack gap={2}>
        <BoardModeSection projectId={projectId} />
        <RepoBindingsSection projectId={projectId} />
        <RuleSetsSection projectId={projectId} />
        <ProcessStepsSection projectId={projectId} />
        <AgentsExportSection projectId={projectId} />
      </Stack>
    </Stack>
  )
})
