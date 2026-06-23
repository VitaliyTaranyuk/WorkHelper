import { Stack, Typography } from '@mui/material'
import { useTaskHistory } from './useTaskHistory'
import { formatDateDDMMYYYY } from '@/shared/utils/date'

type Props = { projectId: string; taskId: string }

function userName(u?: { firstName?: string; lastName?: string }) {
  if (!u) return ''
  return [u.lastName, u.firstName].filter(Boolean).join(' ')
}

export function TaskHistory({ projectId, taskId }: Props) {
  const { data: history, isLoading } = useTaskHistory({ projectId, taskId })

  if (isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Загрузка истории…
      </Typography>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        История изменений пуста
      </Typography>
    )
  }

  return (
    <Stack gap={1.5}>
      {history.map((entry, idx) => (
        <Stack
          key={idx}
          sx={{
            borderLeft: '2px solid rgba(104,79,227,.35)',
            pl: 1.5,
            py: 0.25,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {formatDateDDMMYYYY(entry.createdAt)} · {userName(entry.user)}
          </Typography>
          <Typography variant="body2">
            {entry.fieldName ? `${entry.fieldName}: ` : ''}
            {entry.initialValue || '—'} → {entry.newValue || '—'}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}
