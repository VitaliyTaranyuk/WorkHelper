import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Autocomplete,
  Button,
  Chip,
  FormControl,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import LinkIcon from '@mui/icons-material/Link'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { notify as toast } from '@/shared/ui/notify'
import { MenuItem, Select } from '@/shared/ui/mui/Select'
import { workTechApi } from '@/shared/api/endpoint'
import { workTechApiClient } from '@/shared/api/workTechHttpClient'
import { API_ENDPOINT_PATH } from '@/shared/api/endpointPath'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import { useActiveSprintTasks } from './query/useActiveSprintTasks'

type Props = { projectId: string; taskId: string; taskCode: string }

/** Ответ GET /tasks/{taskId}/{projectId}/links (расширен кодами/названиями). */
type TaskLinkDto = {
  linkId: string
  source: string
  target: string
  name: string
  description: string
  sourceCode?: string
  sourceTitle?: string
  targetCode?: string
  targetTitle?: string
}

/**
 * Типы связей (Jira-модель): направленные пары нормализуются бэкендом
 * (BLOCKED_BY хранится как BLOCKS с обратным направлением).
 */
const LINK_TYPE_OPTIONS = [
  { value: 'RELATED', label: 'Связана с' },
  { value: 'BLOCKS', label: 'Блокирует' },
  { value: 'BLOCKED_BY', label: 'Заблокирована' },
  { value: 'DEPENDS_ON', label: 'Зависит от' },
  { value: 'DUPLICATES', label: 'Дублирует' },
  { value: 'PARENT_OF', label: 'Родительская для' },
  { value: 'CHILD_OF', label: 'Дочерняя для' },
  { value: 'AFFECTS', label: 'Влияет на' },
] as const

/**
 * Блок «Связи» в карточке задачи (ТП-38, паттерн Jira issue links):
 * выбор типа связи + задачи проекта, список связей гиперссылками
 * на карточку связанной задачи, удаление связи.
 */
export function TaskLinks({ projectId, taskId, taskCode }: Props) {
  const qc = useQueryClient()
  const [type, setType] = useState<string>('BLOCKS')
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(
    null,
  )

  const { data: links, isLoading } = useQuery({
    queryKey: ['taskLinks', projectId, taskId],
    queryFn: () =>
      workTechApi.task
        .getAllTasksLinks({ taskId, projectId })
        .then((r) => (r.data ?? []) as TaskLinkDto[]),
  })

  const { data: projectTasks } = useActiveSprintTasks({ projectId })

  const taskOptions = useMemo(
    () =>
      (projectTasks ?? [])
        .filter((t) => t.id !== taskId)
        .map((t) => ({ id: t.id, label: `${t.code} · ${t.title}` })),
    [projectTasks, taskId],
  )

  const createLink = useMutation({
    mutationFn: () =>
      workTechApi.task.linkTask({
        data: {
          projectId,
          taskIdSource: taskId,
          taskIdTarget: selected!.id,
          linkTypeName: type,
        },
      }),
    onSuccess: () => {
      // ТП-71: без success-тоста — связь сразу появляется в списке
      qc.invalidateQueries({ queryKey: ['taskLinks', projectId] })
      setSelected(null)
    },
    onError: (err) =>
      toast.error(extractGeneralError(err) ?? 'Не удалось добавить связь'),
  })

  const deleteLink = useMutation({
    mutationFn: (linkId: string) =>
      workTechApiClient({
        method: 'DELETE',
        url: API_ENDPOINT_PATH.TASKS.DELETE_LINK({ projectId, linkId }),
      }),
    onSuccess: () => {
      // ТП-71: без success-тоста — удаление из списка видно сразу
      qc.invalidateQueries({ queryKey: ['taskLinks', projectId] })
    },
    onError: () => toast.error('Не удалось удалить связь'),
  })

  /** Другая сторона связи относительно текущей задачи. */
  const otherSide = (l: TaskLinkDto) =>
    l.source === taskId
      ? { code: l.targetCode, title: l.targetTitle }
      : { code: l.sourceCode, title: l.sourceTitle }

  /** Подпись направления: source связи — текущая задача или другая. */
  const directionLabel = (l: TaskLinkDto) =>
    l.source === taskId ? l.description : `${l.description} (${l.sourceCode})`

  return (
    <Stack gap={1}>
      <Stack direction="row" alignItems="center" gap={1}>
        <LinkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle2">Связи</Typography>
        <Typography variant="caption" color="text.secondary">
          ({links?.length ?? 0})
        </Typography>
      </Stack>

      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select value={type} onChange={(e) => setType(String(e.target.value))}>
            {LINK_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Autocomplete
          size="small"
          sx={{ flex: 1, minWidth: 220 }}
          options={taskOptions}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          noOptionsText="Задачи не найдены"
          renderInput={(params) => (
            <TextField {...params} placeholder="Найдите задачу по коду или названию" />
          )}
        />
        <Button
          size="small"
          variant="outlined"
          disabled={!selected || createLink.isPending}
          onClick={() => createLink.mutate()}
          sx={{ textTransform: 'none' }}
        >
          Связать
        </Button>
      </Stack>

      {isLoading && (
        <Typography variant="caption" color="text.secondary">
          Загрузка связей…
        </Typography>
      )}

      {!isLoading && (!links || links.length === 0) && (
        <Typography variant="caption" color="text.disabled">
          Связей нет. Свяжите {taskCode} с другой задачей, чтобы зафиксировать
          порядок выполнения (блокирующие задачи выполняются первыми).
        </Typography>
      )}

      <Stack gap={0.5}>
        {(links ?? []).map((l) => {
          const other = otherSide(l)
          return (
            <Stack
              key={l.linkId}
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                p: '4px 8px',
                borderRadius: 1,
                backgroundColor: 'var(--wt-surface-muted)',
                '&:hover': { backgroundColor: 'var(--wt-surface-hover)' },
              }}
            >
              <Chip
                label={directionLabel(l)}
                size="small"
                variant="outlined"
                sx={{ flexShrink: 0 }}
              />
              {other.code ? (
                // Обычный <a>, а не router-<Link>: блок связей рендерится и в
                // TaskCardModal (NiceModal-провайдер смонтирован ВНЕ
                // RouterProvider) — router-компоненты там падают с
                // «useRouter must be used inside a <RouterProvider>» и
                // обваливают всё приложение в белый экран (ТП-39).
                <a
                  href={`/task/${encodeURIComponent(other.code)}`}
                  style={{ minWidth: 0, textDecoration: 'none' }}
                >
                  <Typography
                    variant="body2"
                    noWrap
                    title={`${other.code} · ${other.title ?? ''}`}
                    sx={{
                      color: 'primary.main',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {other.code} · {other.title}
                  </Typography>
                </a>
              ) : (
                <Typography variant="body2" color="text.secondary" noWrap>
                  задача недоступна
                </Typography>
              )}
              <Stack direction="row" sx={{ ml: 'auto', flexShrink: 0 }}>
                <Tooltip title="Удалить связь">
                  <IconButton
                    size="small"
                    onClick={() => deleteLink.mutate(l.linkId)}
                    disabled={deleteLink.isPending}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          )
        })}
      </Stack>
    </Stack>
  )
}
