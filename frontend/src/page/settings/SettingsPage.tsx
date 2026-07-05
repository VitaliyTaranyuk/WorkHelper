import { memo } from 'react'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import KeyboardVoiceOutlinedIcon from '@mui/icons-material/KeyboardVoiceOutlined'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useSettingsStore } from '@/features/settings/settingsStore'
import { useThemeMode, type ThemeMode } from '@/features/settings/themeMode'
import { VoiceHelpContent } from '@/features/voice/command/VoiceHelpContent'
import { useHotkeySetting } from '@/features/voice/useVoiceHotkey'
import { useOnboardingTrigger } from '@/features/voice/onboarding/onboardingTrigger'

/**
 * Настройки приложения (ТП-56).
 *
 * Аудит показал: прежние вкладки-муляжи удалены (практика зрелых TMS: не
 * показывать настройки, которые ни на что не влияют). Здесь — реально
 * работающие параметры (тема) и справочный центр по голосовому помощнику
 * (ТП-110). Настройки уведомлений переехали в саму панель колокольчика
 * (ТП-120), настройки календаря живут в самом календаре — рядом с их объектом.
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
  const startOnboarding = useOnboardingTrigger((s) => s.start)
  return (
    <section>
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ mb: 1, flexWrap: 'wrap' }}
      >
        <KeyboardVoiceOutlinedIcon
          fontSize="small"
          sx={{ color: 'text.secondary' }}
        />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Голосовой помощник
        </Typography>
        <Box sx={{ flex: 1 }} />
        {/* ТП-118: интерактивное обучение — основной способ знакомства; этот
            раздел остаётся справочником. */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<PlayCircleOutlineIcon />}
          onClick={startOnboarding}
        >
          Пройти обучение
        </Button>
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
        <DarkModeOutlinedIcon
          fontSize="small"
          sx={{ color: 'text.secondary' }}
        />
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
          <ToggleButton
            key={o.value}
            value={o.value}
            sx={{ textTransform: 'none' }}
          >
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
