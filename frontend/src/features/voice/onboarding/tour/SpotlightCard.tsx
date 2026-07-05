import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import GraphicEqIcon from '@mui/icons-material/GraphicEq'
import type { TourStep } from './tourTypes'

/**
 * Карточка одного шага тура (ТП-118): заголовок, объяснение текущего действия,
 * прогресс и управление. Презентационная (без DOM/Popper) — тестируется
 * отдельно. Для шагов, ждущих действия пользователя (waitForEvent), кнопка
 * «Далее» скрыта, вместо неё — подсказка «выполните действие».
 */
export function SpotlightCard({
  step,
  index,
  total,
  isFirst,
  isLast,
  onNext,
  onPrev,
  onSkip,
}: {
  step: TourStep
  index: number
  total: number
  isFirst: boolean
  isLast: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}) {
  return (
    <Paper
      elevation={8}
      sx={{ p: 2, maxWidth: 340, borderRadius: 2, pointerEvents: 'auto' }}
    >
      <Stack gap={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {step.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          {step.body}
        </Typography>

        {step.waitForEvent && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={0.75}
            sx={{ mt: 0.5 }}
          >
            <Stack direction="row" alignItems="center" gap={0.75}>
              <GraphicEqIcon fontSize="small" color="primary" />
              <Typography variant="caption" color="primary">
                Выполните действие голосом — шаг перейдёт сам
              </Typography>
            </Stack>
            {/* Страховка от застревания, если команда не распозналась. */}
            <Button size="small" color="inherit" onClick={onNext} sx={{ flexShrink: 0 }}>
              Пропустить шаг
            </Button>
          </Stack>
        )}

        {/* Прогресс */}
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
          {Array.from({ length: total }).map((_, i) => (
            <Box
              key={i}
              sx={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                bgcolor: i <= index ? 'primary.main' : 'divider',
              }}
            />
          ))}
        </Box>

        <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
          <Button size="small" color="inherit" onClick={onSkip}>
            Пропустить
          </Button>
          <Box sx={{ flex: 1 }} />
          {!isFirst && (
            <Button size="small" onClick={onPrev}>
              Назад
            </Button>
          )}
          {!step.waitForEvent && (
            <Button size="small" variant="contained" onClick={onNext}>
              {isLast ? 'Готово' : 'Далее'}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
