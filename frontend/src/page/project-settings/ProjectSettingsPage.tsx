import { memo } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useDeclareCurrentProject } from '@/features/project/model/currentProjectStore'
import { useProjectData } from '@/features/project/query/useProjectData'
import { RepoBindingsSection } from '@/features/project/RepoBindingsSection'
import { RuleSetsSection } from '@/features/rules/RuleSetsSection'
import { AgentsExportSection } from '@/features/rules/AgentsExportSection'

/**
 * Настройки проекта (фаза 5).
 *
 * Отдельный раздел, а не вкладка глобальных настроек: у `/settings` другой
 * скоуп — тема, голос, данные пользователя. Проектные настройки принадлежат
 * проекту и живут по его адресу, как доска и бэклог (ADR-026).
 *
 * Правила проекта (T-511) уже здесь; сюда же придут процесс задачи (T-515) и
 * режим доски (T-519) — раздел заведён под них, а не только под репозитории.
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
        <RepoBindingsSection projectId={projectId} />
        <RuleSetsSection projectId={projectId} />
        <AgentsExportSection projectId={projectId} />
      </Stack>
    </Stack>
  )
})
