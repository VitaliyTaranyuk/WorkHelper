import { useQuery } from '@tanstack/react-query'
import { Chip, Stack, Tooltip, Typography } from '@mui/material'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import MergeTypeIcon from '@mui/icons-material/MergeType'
import { workTechApi } from '@/shared/api/endpoint'

type Props = { projectId: string; taskId: string; taskCode: string }

const PR_STATE_LABEL: Record<string, string> = {
  open: 'Открыт',
  merged: 'Смержен',
  closed: 'Закрыт',
}

const PR_STATE_COLOR: Record<string, 'success' | 'secondary' | 'default'> = {
  open: 'success',
  merged: 'secondary',
  closed: 'default',
}

/**
 * Панель «Разработка» в карточке задачи (ТП-21, паттерн Jira dev panel):
 * ветки и pull request'ы GitHub, связанные с задачей по её коду
 * (ветка/PR с «tp{N}» в имени или кодом задачи в заголовке).
 * Ссылки — обычные <a>: компонент живёт и в NiceModal-модалке (см. ТП-39).
 */
export function TaskDevPanel({ projectId, taskId, taskCode }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['devInfo', projectId, taskId],
    queryFn: () =>
      workTechApi.task.getDevInfo({ projectId, taskId }).then((r) => r.data),
    staleTime: 60_000,
  })

  return (
    <Stack gap={1}>
      <Stack direction="row" alignItems="center" gap={1}>
        <AccountTreeOutlinedIcon
          fontSize="small"
          sx={{ color: 'text.secondary' }}
        />
        <Typography variant="subtitle2">Разработка</Typography>
        {data?.available && (
          <Typography variant="caption" color="text.secondary">
            ({data.branches.length + data.pullRequests.length})
          </Typography>
        )}
      </Stack>

      {isLoading && (
        <Typography variant="caption" color="text.secondary">
          Загрузка данных GitHub…
        </Typography>
      )}

      {!isLoading && data && !data.available && (
        <Typography variant="caption" color="text.disabled">
          {data.message ?? 'GitHub недоступен'}
        </Typography>
      )}

      {/* ТП-73: компактное пустое состояние — одна строка. */}
      {!isLoading &&
        data?.available &&
        data.branches.length === 0 &&
        data.pullRequests.length === 0 && (
          <Typography variant="caption" color="text.disabled">
            Связанных веток и PR нет — привяжутся автоматически по коду {taskCode}
          </Typography>
        )}

      <Stack gap={0.5}>
        {(data?.pullRequests ?? []).map((pr) => (
          <Stack
            key={pr.number}
            direction="row"
            alignItems="center"
            gap={1}
            sx={{
              p: '4px 8px',
              borderRadius: 1,
              backgroundColor: 'rgba(246, 246, 246, .6)',
              '&:hover': { backgroundColor: 'rgba(246, 246, 246, .9)' },
            }}
          >
            <MergeTypeIcon
              fontSize="small"
              sx={{ color: 'text.secondary', flexShrink: 0 }}
            />
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              style={{ minWidth: 0, textDecoration: 'none' }}
            >
              <Typography
                variant="body2"
                noWrap
                title={pr.title}
                sx={{
                  color: 'primary.main',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                #{pr.number} · {pr.title}
              </Typography>
            </a>
            <Chip
              size="small"
              variant="outlined"
              color={PR_STATE_COLOR[pr.state] ?? 'default'}
              label={PR_STATE_LABEL[pr.state] ?? pr.state}
              sx={{ height: 20, ml: 'auto', flexShrink: 0 }}
            />
          </Stack>
        ))}

        {(data?.branches ?? []).map((branch) => (
          <Stack
            key={branch.name}
            direction="row"
            alignItems="center"
            gap={1}
            sx={{
              p: '4px 8px',
              borderRadius: 1,
              backgroundColor: 'rgba(246, 246, 246, .6)',
              '&:hover': { backgroundColor: 'rgba(246, 246, 246, .9)' },
            }}
          >
            <CallSplitIcon
              fontSize="small"
              sx={{ color: 'text.secondary', flexShrink: 0 }}
            />
            <a
              href={branch.url}
              target="_blank"
              rel="noreferrer"
              style={{ minWidth: 0, textDecoration: 'none' }}
            >
              <Typography
                variant="body2"
                noWrap
                title={branch.name}
                sx={{
                  color: 'primary.main',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {branch.name}
              </Typography>
            </a>
            {branch.lastCommitSha && branch.lastCommitUrl && (
              <Tooltip title="Последний коммит ветки">
                <a
                  href={branch.lastCommitUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginLeft: 'auto',
                    flexShrink: 0,
                    textDecoration: 'none',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {branch.lastCommitSha.slice(0, 7)}
                  </Typography>
                </a>
              </Tooltip>
            )}
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}
