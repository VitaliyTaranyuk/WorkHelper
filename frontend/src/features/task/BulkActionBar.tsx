import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import { useTaskSelectionStore } from '@/features/task/model/taskSelectionStore'
import {
  useBulkArchive,
  useBulkMoveSprint,
  useBulkMoveStatus,
} from '@/features/task/mutation/useBulkTaskActions'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { sprintDisplayLabel } from '@/entities/sprint/label'
import { pluralTasks } from '@/shared/utils/text'

/**
 * Панель массовых действий (T-309). Появляется снизу при выборе задач —
 * паттерн Linear («common bulk actions show up at the bottom once multiple
 * issues are selected»), а не отдельный режим страницы: выбор и работа со
 * списком не должны исключать друг друга.
 *
 * <p>Действия только обратимые. Удаление и перенос между проектами сюда не
 * выведены осознанно: первое необратимо, второе перевыдаёт код задачи.
 */
export function BulkActionBar({ projectId }: { projectId: string }) {
  const selectedIds = useTaskSelectionStore((s) => s.selectedIds)
  const clear = useTaskSelectionStore((s) => s.clear)

  const { activeProject } = useProjectData()
  const { data: sprints } = useSprintsInfoQuery({ projectId })

  const archive = useBulkArchive()
  const moveStatus = useBulkMoveStatus()
  const moveSprint = useBulkMoveSprint()

  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null)
  const [sprintAnchor, setSprintAnchor] = useState<null | HTMLElement>(null)

  const busy =
    archive.isPending || moveStatus.isPending || moveSprint.isPending

  // Esc снимает выбор — как в Linear. Слушатель живёт только пока панель
  // показана, иначе он перехватывал бы Esc у модалок.
  const clearRef = useRef(clear)
  clearRef.current = clear
  const hasSelection = selectedIds.length > 0
  useEffect(() => {
    if (!hasSelection) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasSelection])

  // Доскные колонки: скрытые и служебный Backlog целями не предлагаем —
  // тот же отбор, что у завершающего статуса в useProjectData.
  const boardStatuses = useMemo(
    () =>
      (activeProject?.statuses ?? []).filter(
        (s) => s.viewed && !s.defaultTaskStatus,
      ),
    [activeProject?.statuses],
  )

  if (!hasSelection) return null

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action()
      // Выбор снимается только после успеха: при рассинхроне пользователь
      // видит тост и сохраняет отметки, чтобы повторить осознанно.
      clear()
    } catch {
      // Причина уже показана тостом в мутации.
    }
  }

  return (
    <Paper
      elevation={8}
      role="region"
      aria-label="Действия над выбранными задачами"
      sx={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 24,
        zIndex: (theme) => theme.zIndex.snackbar,
        px: 2,
        py: 1.25,
        borderRadius: 2,
        backgroundColor: 'var(--wt-bg)',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        gap={1.5}
        alignItems={{ sm: 'center' }}
      >
        <Typography sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          Выбрано: {pluralTasks(selectedIds.length)}
        </Typography>

        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            size="small"
            startIcon={<ArchiveOutlinedIcon fontSize="small" />}
            disabled={busy}
            onClick={() =>
              void run(() =>
                archive.mutateAsync({ projectId, taskIds: selectedIds }),
              )
            }
          >
            В архив
          </Button>

          <Button
            size="small"
            disabled={busy || boardStatuses.length === 0}
            onClick={(e) => setStatusAnchor(e.currentTarget)}
          >
            Статус…
          </Button>

          <Button
            size="small"
            disabled={busy || !sprints?.length}
            onClick={(e) => setSprintAnchor(e.currentTarget)}
          >
            В спринт…
          </Button>

          <Button size="small" color="inherit" disabled={busy} onClick={clear}>
            Снять выбор
          </Button>
        </Stack>
      </Stack>

      <Menu
        anchorEl={statusAnchor}
        open={Boolean(statusAnchor)}
        onClose={() => setStatusAnchor(null)}
      >
        {boardStatuses.map((status) => (
          <MenuItem
            key={status.id}
            onClick={() => {
              setStatusAnchor(null)
              void run(() =>
                moveStatus.mutateAsync({
                  projectId,
                  taskIds: selectedIds,
                  statusId: status.id,
                }),
              )
            }}
          >
            {status.description || status.code}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={sprintAnchor}
        open={Boolean(sprintAnchor)}
        onClose={() => setSprintAnchor(null)}
      >
        {(sprints ?? []).map((sprint) => (
          <MenuItem
            key={sprint.id}
            onClick={() => {
              setSprintAnchor(null)
              void run(() =>
                moveSprint.mutateAsync({
                  projectId,
                  taskIds: selectedIds,
                  targetSprintId: sprint.id,
                }),
              )
            }}
          >
            {sprintDisplayLabel(sprint)}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  )
}
