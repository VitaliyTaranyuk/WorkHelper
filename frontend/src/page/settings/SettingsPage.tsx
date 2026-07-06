import { memo, useState } from 'react'
import {
  Box,
  Button,
  Collapse,
  Stack,
  Typography,
} from '@mui/material'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import KeyboardVoiceOutlinedIcon from '@mui/icons-material/KeyboardVoiceOutlined'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useSettingsStore } from '@/features/settings/settingsStore'
import { useThemeMode, type ThemeMode } from '@/features/settings/themeMode'
import { VoiceHelpContent } from '@/features/voice/command/VoiceHelpContent'
import { useHotkeySetting, formatHotkey } from '@/features/voice/useVoiceHotkey'
import { useOnboardingTrigger } from '@/features/voice/onboarding/onboardingTrigger'
import { SettingsSection } from './SettingsSection'

/**
 * Настройки приложения (ТП-56, переработка ТП-150).
 *
 * Единый визуальный язык с остальным приложением: каждая секция — карточка
 * (SettingsSection), как панели карточки задачи и колонок доски. Здесь только
 * реально работающие параметры; настройки уведомлений живут в колокольчике
 * (ТП-120), календаря — в календаре.
 *
 * Голосовой помощник (решения по анализу ТП-150): основной способ знакомства —
 * интерактивное обучение (ТП-118, «Пройти обучение» — главный CTA секции);
 * полный справочник команд НЕ вываливается простынёй, а раскрывается по
 * запросу (паттерн progressive disclosure — Linear/ClickUp settings). Тот же
 * справочник доступен с любого экрана кнопкой «?» у микрофона.
 */
export const SettingsPage = memo(function SettingsPageInner() {
  return (
    <Box maxWidth={720}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Настройки
      </Typography>

      <Stack gap={2}>
        <ThemeSection />
        <VoiceAssistantSection />
        <InterfaceDataSection />
      </Stack>
    </Box>
  )
})

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Системная' },
]

/** Выбор темы оформления (ТП-64): light / dark / system. */
function ThemeSection() {
  const { mode, setMode } = useThemeMode()
  return (
    <SettingsSection
      icon={<DarkModeOutlinedIcon fontSize="small" />}
      title="Тема оформления"
      description="«Системная» следует настройке оформления вашей ОС."
    >
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
            sx={{ textTransform: 'none', px: 2 }}
          >
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </SettingsSection>
  )
}

/**
 * Голосовой помощник (ТП-110/ТП-150): знакомство — интерактивное обучение,
 * справочник команд — по запросу (Collapse), контент общий с модалкой «?»
 * (VoiceHelpContent) — без дублирования.
 */
function VoiceAssistantSection() {
  const [hotkey] = useHotkeySetting()
  const startOnboarding = useOnboardingTrigger((s) => s.start)
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <SettingsSection
      icon={<KeyboardVoiceOutlinedIcon fontSize="small" />}
      title="Голосовой помощник"
      description={`Управляйте WorkTask обычной речью: кнопка микрофона или ${formatHotkey(hotkey)} (нажать — или удерживать как рацию).`}
      action={
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayCircleOutlineIcon />}
          onClick={startOnboarding}
          sx={{ textTransform: 'none' }}
        >
          Пройти обучение
        </Button>
      }
    >
      <Button
        size="small"
        variant="text"
        color="inherit"
        onClick={() => setHelpOpen((v) => !v)}
        startIcon={helpOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ textTransform: 'none', color: 'text.secondary' }}
      >
        {helpOpen ? 'Скрыть справочник команд' : 'Справочник команд и примеры фраз'}
      </Button>
      <Collapse in={helpOpen} unmountOnExit>
        <Box sx={{ mt: 1.5 }}>
          <VoiceHelpContent hotkey={hotkey} />
        </Box>
      </Collapse>
    </SettingsSection>
  )
}

/** Сброс локальных настроек интерфейса (вид календаря и т.п.). */
function InterfaceDataSection() {
  const resetSettings = useSettingsStore((s) => s.reset)
  return (
    <SettingsSection
      icon={<TuneOutlinedIcon fontSize="small" />}
      title="Данные интерфейса"
      description="Вернёт вид календаря к значению по умолчанию."
      action={
        <Button
          size="small"
          variant="outlined"
          startIcon={<RestartAltIcon fontSize="small" />}
          // ТП-71: без тоста — сброшенные значения видны на этой же странице
          onClick={() => resetSettings()}
          sx={{ textTransform: 'none' }}
        >
          Сбросить
        </Button>
      }
    />
  )
}
