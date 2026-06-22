import { memo, useState } from 'react'
import {
  Box,
  Stack,
  Tab,
  Tabs,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Button,
} from '@mui/material'
import { useSettingsStore } from '@/features/settings/settingsStore'
import { toast } from 'sonner'

const TAB_LABELS = [
  'Уведомления',
  'Календарь',
  'Доска',
  'Тема',
  'Интерфейс',
] as const

/**
 * Настройки пользователя.
 *
 * Текущая реализация — на стороне клиента (LocalStorage через zustand-persist).
 * Серверные настройки (UserSettings entity) — следующий этап (NB: можно перенести,
 * не меняя контракт компонента, поскольку слой хранения изолирован в settingsStore).
 *
 * Структура вкладок и доступные опции взяты по лучшим практикам Jira/Linear/Notion:
 * — Уведомления: бэлл, mentions, дедлайны, встречи, время напоминаний.
 * — Календарь: вид по умолчанию, начало недели, рабочие часы.
 * — Доска: WIP-лимиты (placeholder), скрытие пустых колонок, плотность карточек.
 * — Тема: light/dark/system.
 * — Интерфейс: язык, плотность UI.
 */
export const SettingsPage = memo(function SettingsPageInner() {
  const [tab, setTab] = useState(0)
  const settings = useSettingsStore()

  const handleSave = () => {
    toast.success('Настройки сохранены')
  }

  return (
    <Box maxWidth={840}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Настройки
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {TAB_LABELS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <Box sx={{ py: 3 }}>
        {tab === 0 && (
          <Stack gap={2}>
            <Typography variant="subtitle1">In-app уведомления</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifyMentions}
                  onChange={(_, v) => settings.set({ notifyMentions: v })}
                />
              }
              label="Упоминания (@mention)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifyDeadlines}
                  onChange={(_, v) => settings.set({ notifyDeadlines: v })}
                />
              }
              label="Дедлайны задач"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifyMeetings}
                  onChange={(_, v) => settings.set({ notifyMeetings: v })}
                />
              }
              label="Встречи и напоминания"
            />
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Время напоминания</Typography>
            <Stack direction="row" gap={2} alignItems="center">
              <Typography variant="body2">За</Typography>
              <Select
                size="small"
                value={settings.reminderMinutes}
                onChange={(e) =>
                  settings.set({ reminderMinutes: Number(e.target.value) })
                }
                sx={{ minWidth: 120 }}
              >
                {[5, 10, 15, 30, 60, 120].map((m) => (
                  <MenuItem key={m} value={m}>
                    {m} мин
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2">до события</Typography>
            </Stack>
          </Stack>
        )}

        {tab === 1 && (
          <Stack gap={2}>
            <Typography variant="subtitle1">Вид календаря</Typography>
            <Select
              size="small"
              value={settings.calendarView}
              onChange={(e) =>
                settings.set({
                  calendarView: e.target.value as 'day' | 'week' | 'month',
                })
              }
              sx={{ maxWidth: 240 }}
            >
              <MenuItem value="day">День</MenuItem>
              <MenuItem value="week">Неделя</MenuItem>
              <MenuItem value="month">Месяц</MenuItem>
            </Select>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Начало недели
            </Typography>
            <Select
              size="small"
              value={settings.weekStart}
              onChange={(e) =>
                settings.set({ weekStart: Number(e.target.value) as 0 | 1 })
              }
              sx={{ maxWidth: 240 }}
            >
              <MenuItem value={1}>Понедельник</MenuItem>
              <MenuItem value={0}>Воскресенье</MenuItem>
            </Select>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Рабочие часы
            </Typography>
            <Stack direction="row" gap={2}>
              <TextField
                label="С"
                size="small"
                type="time"
                value={settings.workdayStart}
                onChange={(e) => settings.set({ workdayStart: e.target.value })}
              />
              <TextField
                label="До"
                size="small"
                type="time"
                value={settings.workdayEnd}
                onChange={(e) => settings.set({ workdayEnd: e.target.value })}
              />
            </Stack>
          </Stack>
        )}

        {tab === 2 && (
          <Stack gap={2}>
            <Typography variant="subtitle1">Поведение доски</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.hideEmptyCounters}
                  onChange={(_, v) => settings.set({ hideEmptyCounters: v })}
                />
              }
              label="Скрывать счётчик (0) у пустых колонок"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.compactCards}
                  onChange={(_, v) => settings.set({ compactCards: v })}
                />
              }
              label="Компактные карточки задач"
            />
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              WIP-лимит (макс. задач в работе)
            </Typography>
            <TextField
              size="small"
              type="number"
              value={settings.wipLimit ?? ''}
              placeholder="Без лимита"
              onChange={(e) =>
                settings.set({
                  wipLimit: e.target.value ? Number(e.target.value) : null,
                })
              }
              sx={{ maxWidth: 200 }}
            />
          </Stack>
        )}

        {tab === 3 && (
          <Stack gap={2}>
            <Typography variant="subtitle1">Тема оформления</Typography>
            <Select
              size="small"
              value={settings.theme}
              onChange={(e) =>
                settings.set({
                  theme: e.target.value as 'light' | 'dark' | 'system',
                })
              }
              sx={{ maxWidth: 240 }}
            >
              <MenuItem value="light">Светлая</MenuItem>
              <MenuItem value="dark">Тёмная</MenuItem>
              <MenuItem value="system">Системная</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary">
              Тёмная тема будет применена при следующей загрузке приложения.
            </Typography>
          </Stack>
        )}

        {tab === 4 && (
          <Stack gap={2}>
            <Typography variant="subtitle1">Интерфейс</Typography>
            <Select
              size="small"
              value={settings.language}
              onChange={(e) => settings.set({ language: e.target.value as 'ru' | 'en' })}
              sx={{ maxWidth: 240 }}
            >
              <MenuItem value="ru">Русский</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Плотность интерфейса
            </Typography>
            <Select
              size="small"
              value={settings.density}
              onChange={(e) =>
                settings.set({ density: e.target.value as 'comfortable' | 'compact' })
              }
              sx={{ maxWidth: 240 }}
            >
              <MenuItem value="comfortable">Стандартная</MenuItem>
              <MenuItem value="compact">Компактная</MenuItem>
            </Select>
          </Stack>
        )}
      </Box>

      <Stack direction="row" gap={2} sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSave}>
          Сохранить
        </Button>
        <Button variant="outlined" onClick={settings.reset}>
          Сбросить
        </Button>
      </Stack>
    </Box>
  )
})
