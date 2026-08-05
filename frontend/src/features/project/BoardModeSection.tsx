import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import { SettingsSection } from '@/page/settings/SettingsSection'
import { SkeletonLine } from '@/shared/ui/components/Skeleton'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useSetBoardMode } from '@/features/project/mutation/useProjectActions'

/**
 * T-519: режим доски проекта.
 *
 * Kanban-поведение работало и раньше, но включалось **отсутствием** активного спринта —
 * то есть режимом никто не управлял, а состояние было неявным (тот же класс ошибки, что
 * «текущий проект» до T-518). Здесь оно становится решением пользователя.
 *
 * **Спринты не удаляются** (T-156 отменена решением владельца 2026-08-05): переключение
 * обратимо, и возврат в «Спринты» возвращает активный спринт на доску. Раздел говорит об
 * этом прямо — иначе переключение выглядело бы разрушительным.
 */
export function BoardModeSection({ projectId }: { projectId: string }) {
  const { activeProject, isLoading } = useProjectData()
  const setBoardMode = useSetBoardMode()

  const mode = activeProject?.boardMode ?? 'SPRINT'

  if (isLoading) return <SkeletonLine height={40} />

  return (
    <SettingsSection
      icon={<ViewKanbanOutlinedIcon fontSize="small" />}
      title="Режим доски"
      description="«Спринты» — доска показывает активный спринт. «Kanban» — спринты не используются, доска показывает задачи из бэклога."
    >
      <Stack gap={1.5}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          disabled={setBoardMode.isPending}
          onChange={(_, value: string | null) => {
            // Повторный клик по выбранному режиму ничего не меняет: «нет режима»
            // означало бы возврат к неявному состоянию, ради которого задача и делалась.
            if (value) setBoardMode.mutate({ projectId, boardMode: value })
          }}
        >
          <ToggleButton value="SPRINT" sx={{ px: 2, textTransform: 'none' }}>
            Спринты
          </ToggleButton>
          <ToggleButton value="KANBAN" sx={{ px: 2, textTransform: 'none' }}>
            Kanban
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="body2" color="text.secondary">
          Переключение обратимо: спринты не удаляются, и возврат к «Спринтам» вернёт
          активный спринт на доску.
        </Typography>
      </Stack>
    </SettingsSection>
  )
}
