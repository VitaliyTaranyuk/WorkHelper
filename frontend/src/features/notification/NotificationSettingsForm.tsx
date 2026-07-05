import {
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/features/settings/useNotificationSettings'

/** Варианты «напомнить за N минут» до встречи. */
const REMINDER_OPTIONS = [5, 10, 15, 30, 60, 120] as const

/**
 * Форма серверных настроек уведомлений (ТП-65). Вынесена в отдельный компонент
 * (ТП-120), чтобы жить прямо в панели колокольчика — там, где пользователь
 * читает уведомления (практика GitHub/Slack/Linear: настройки уведомлений
 * доступны из самой панели уведомлений, а не в общем разделе настроек).
 */
export function NotificationSettingsForm() {
  const { data, isLoading } = useNotificationSettings()
  const update = useUpdateNotificationSettings()

  const patch = (partial: Partial<NonNullable<typeof data>>) => {
    if (!data) return
    update.mutate({ ...data, ...partial })
  }

  if (isLoading || !data) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
        Загрузка настроек…
      </Typography>
    )
  }

  return (
    <Stack gap={0.5} sx={{ px: 2, py: 1.5 }}>
      <FormControlLabel
        control={
          <Switch
            checked={data.notifyMentions}
            onChange={(_, v) => patch({ notifyMentions: v })}
          />
        }
        label="Упоминания в комментариях (@username)"
      />
      <FormControlLabel
        control={
          <Switch
            checked={data.notifyTaskCreated}
            onChange={(_, v) => patch({ notifyTaskCreated: v })}
          />
        }
        label="Создание задачи"
      />
      <FormControlLabel
        control={
          <Switch
            checked={data.notifyMeetings}
            onChange={(_, v) => patch({ notifyMeetings: v })}
          />
        }
        label="Напоминания о встречах"
      />
      <Stack
        direction="row"
        alignItems="center"
        gap={1.5}
        sx={{ mt: 1, opacity: data.notifyMeetings ? 1 : 0.5 }}
      >
        <Typography variant="body2">Напоминать за</Typography>
        <Select
          size="small"
          value={data.reminderMinutes}
          disabled={!data.notifyMeetings}
          onChange={(e) => patch({ reminderMinutes: Number(e.target.value) })}
          sx={{ minWidth: 110 }}
        >
          {REMINDER_OPTIONS.map((m) => (
            <MenuItem key={m} value={m}>
              {m} мин
            </MenuItem>
          ))}
        </Select>
        <Typography variant="body2">до начала встречи</Typography>
      </Stack>
    </Stack>
  )
}
