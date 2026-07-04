import { memo, useEffect, useState } from 'react'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { toast } from 'sonner'
import { useSettingsStore } from '@/features/settings/settingsStore'
import {
  DEFAULT_HOTKEY,
  formatHotkey,
  hotkeyFromEvent,
  useHotkeySetting,
} from '@/features/voice/useVoiceHotkey'

/**
 * Настройки приложения (ТП-56).
 *
 * Аудит показал: прежние вкладки (Уведомления, Календарь, Доска, Тема,
 * Интерфейс) были муляжами — значения сохранялись, но ни один компонент их
 * не читал. Мёртвый UI удалён (практика зрелых TMS: не показывать настройки,
 * которые ни на что не влияют); функциональность вынесена в отдельные задачи
 * (тёмная тема, серверные настройки уведомлений, локализация). Настройки
 * календаря переехали в сам календарь (выбранный вид запоминается).
 *
 * Здесь остаются только реально работающие параметры приложения.
 */
export const SettingsPage = memo(function SettingsPageInner() {
  const resetSettings = useSettingsStore((s) => s.reset)
  const [hotkey, setHotkey] = useHotkeySetting()
  const [capturing, setCapturing] = useState(false)

  // Захват нового сочетания для голосового управления.
  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setCapturing(false)
        return
      }
      const next = hotkeyFromEvent(e)
      if (next) {
        setHotkey(next)
        setCapturing(false)
        toast.success(`Горячая клавиша: ${formatHotkey(next)}`)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturing, setHotkey])

  const resetAll = () => {
    resetSettings()
    setHotkey(DEFAULT_HOTKEY)
    toast.success('Настройки интерфейса сброшены')
  }

  return (
    <Box maxWidth={720}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Настройки
      </Typography>

      <Stack gap={3}>
        <section>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
            <KeyboardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Голосовое управление
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={2}>
            <Typography variant="body2" color="text.secondary">
              Горячая клавиша запуска диктовки:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {capturing ? 'нажмите сочетание… (Esc — отмена)' : formatHotkey(hotkey)}
            </Typography>
            {!capturing && (
              <Button size="small" onClick={() => setCapturing(true)}>
                Изменить
              </Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Голосовая команда: «Создай задачу. Название. Описание…» — работает
            с любого экрана. Кнопка-микрофон находится в шапке.
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Календарь
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Настройки календаря находятся в самом календаре: выбранный вид
            (неделя или месяц) запоминается автоматически.
          </Typography>
        </section>

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
            Вернёт вид календаря и горячую клавишу к значениям по умолчанию.
          </Typography>
        </section>
      </Stack>
    </Box>
  )
})
