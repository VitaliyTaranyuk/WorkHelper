import { useMemo } from 'react'
import { Box, Chip, Stack, Typography } from '@mui/material'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import dayjs from 'dayjs'
import type { MeetingDto } from '@/shared/api/endpoint/meetingsApi'

/**
 * ТП-186 ST-3 — вид «Ближайшие встречи» (agenda). Хронологический список
 * предстоящих встреч, сгруппированный по дням (Сегодня / Завтра / дата) —
 * самый быстрый способ понять «что и когда», без гигантской пустой сетки.
 * Плотный, читается за секунды; клик открывает запись встречи.
 */

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayHeading(key: string): string {
  const d = dayjs(key)
  const today = dayjs().startOf('day')
  if (d.isSame(today, 'day')) return 'Сегодня'
  if (d.isSame(today.add(1, 'day'), 'day')) return 'Завтра'
  const label = d
    .toDate()
    .toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function AgendaView({
  meetings,
  onSelect,
}: {
  meetings: MeetingDto[] | undefined
  onSelect: (m: MeetingDto) => void
}) {
  // Только предстоящее (с начала сегодняшнего дня), по возрастанию времени,
  // сгруппировано по дню.
  const groups = useMemo(() => {
    const from = dayjs().startOf('day').valueOf()
    const upcoming = (meetings ?? [])
      .filter((m) => +new Date(m.startAt) >= from)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
    const byDay = new Map<string, MeetingDto[]>()
    for (const m of upcoming) {
      const key = dayjs(m.startAt).format('YYYY-MM-DD')
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key)!.push(m)
    }
    return [...byDay.entries()]
  }, [meetings])

  if (groups.length === 0) {
    return (
      <Stack alignItems="center" gap={1} sx={{ py: 6 }}>
        <EventBusyOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
        <Typography color="text.secondary">Ближайших встреч нет</Typography>
      </Stack>
    )
  }

  return (
    <Stack gap={2.5} sx={{ maxWidth: 720 }}>
      {groups.map(([key, dayMeetings]) => (
        <Stack key={key} gap={0.75}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: 'text.secondary',
              position: 'sticky',
              top: 0,
            }}
          >
            {dayHeading(key)}
          </Typography>
          {dayMeetings.map((m) => (
            <Stack
              key={m.id}
              direction="row"
              alignItems="center"
              gap={1.5}
              onClick={() => onSelect(m)}
              sx={{
                p: '10px 12px',
                borderRadius: 2,
                cursor: 'pointer',
                backgroundColor: 'var(--wt-surface)',
                border: '1px solid var(--wt-border)',
                '&:hover': { backgroundColor: 'var(--wt-surface-hover)' },
              }}
            >
              {/* Время — колонка фиксированной ширины, читается как ось */}
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  minWidth: 48,
                  color: 'var(--wt-accent)',
                }}
              >
                {formatTime(m.startAt)}
              </Typography>
              <Stack sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
                  {m.title}
                </Typography>
                {m.participants.length > 0 && (
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <GroupOutlinedIcon
                      sx={{ fontSize: 14, color: 'text.secondary' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {m.participants.length}
                    </Typography>
                  </Stack>
                )}
              </Stack>
              {m.link && (
                <Chip
                  size="small"
                  icon={<VideocamOutlinedIcon />}
                  label="Видеовстреча"
                  sx={{
                    flexShrink: 0,
                    backgroundColor: 'var(--wt-accent-soft)',
                    color: 'var(--wt-accent)',
                  }}
                />
              )}
              <Box sx={{ flexShrink: 0 }} />
            </Stack>
          ))}
        </Stack>
      ))}
    </Stack>
  )
}
