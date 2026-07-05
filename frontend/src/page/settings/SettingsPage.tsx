import { memo } from 'react'
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import KeyboardVoiceOutlinedIcon from '@mui/icons-material/KeyboardVoiceOutlined'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useSettingsStore } from '@/features/settings/settingsStore'
import { useThemeMode, type ThemeMode } from '@/features/settings/themeMode'
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/features/settings/useNotificationSettings'
import { VoiceHelpContent } from '@/features/voice/command/VoiceHelpContent'
import { useHotkeySetting } from '@/features/voice/useVoiceHotkey'

/**
 * Настройки приложения (ТП-56).
 *
 * Аудит показал: прежние вкладки-муляжи удалены (практика зрелых TMS: не
 * показывать настройки, которые ни на что не влияют). Здесь — реально
 * работающие параметры (тема, серверные уведомления) и справочный центр по
 * голосовому помощнику (ТП-110; заменил формальный блок «Календарь» — настройки
 * календаря живут в самом календаре).
 */
export const SettingsPage = memo(function SettingsPageInner() {
  const resetSettings = useSettingsStore((s) => s.reset)

  const resetAll = () => {
    // ТП-71: без тоста — сброшенные значения видны на этой же странице
    resetSettings()
  }

  return (
    <Box maxWidth={720}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Настройки
      </Typography>

      <Stack gap={3}>
        <ThemeSection />

        <Divider />

        <NotificationSettingsSection />

        <Divider />

        <VoiceAssistantSection />

        <Divider />

        <section>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Данные интерфейса
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RestartAltIcon fontSize="small" />}
            onClick={resetAll}
          >
            Сбросить настройки интерфейса
          </Button>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.5 }}
          >
            Вернёт вид календаря к значению по умолчанию.
          </Typography>
        </section>
      </Stack>
    </Box>
  )
})

/**
 * Справочный раздел о голосовом помощнике (ТП-110): не технические настройки, а
 * справочный центр — как запустить, что умеет, примеры фраз, советы, ограничения.
 * Содержимое — общий `VoiceHelpContent` (тот же, что в модалке-справке, ТП-107),
 * без дублирования логики. Заменил бывший блок «Календарь».
 */
function VoiceAssistantSection() {
  const [hotkey] = useHotkeySetting()
  return (
    <section>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <KeyboardVoiceOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Голосовой помощник
        </Typography>
      </Stack>
      <VoiceHelpContent hotkey={hotkey} />
    </section>
  )
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Системная' },
]

/** Выбор темы оформления (ТП-64): light / dark / system. */
function ThemeSection() {
  const { mode, setMode } = useThemeMode()
  return (
    <section>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <DarkModeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Тема оформления
        </Typography>
      </Stack>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={mode}
        onChange={(_, v: ThemeMode | null) => v && setMode(v)}
      >
        {THEME_OPTIONS.map((o) => (
          <ToggleButton key={o.value} value={o.value} sx={{ textTransform: 'none' }}>
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 0.5 }}
      >
        «Системная» следует настройке оформления вашей ОС.
      </Typography>
    </section>
  )
}

const REMINDER_OPTIONS = [5, 10, 15, 30, 60, 120] as const

/**
 * Серверные настройки уведомлений (ТП-65): что уведомлять и за сколько минут
 * до встречи. Реально влияют на генерацию уведомлений на бэкенде.
 */
function NotificationSettingsSection() {
  const { data, isLoading } = useNotificationSettings()
  const update = useUpdateNotificationSettings()

  const patch = (partial: Partial<NonNullable<typeof data>>) => {
    if (!data) return
    update.mutate({ ...data, ...partial })
  }

  return (
    <section>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <NotificationsNoneOutlinedIcon
          fontSize="small"
          sx={{ color: 'text.secondary' }}
        />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Уведомления
        </Typography>
      </Stack>

      {isLoading || !data ? (
        <Typography variant="body2" color="text.secondary">
          Загрузка настроек…
        </Typography>
      ) : (
        <Stack gap={0.5}>
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
      )}
    </section>
  )
}
