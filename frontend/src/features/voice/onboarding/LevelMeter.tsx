import Box from '@mui/material/Box'
import { SIGNAL_THRESHOLD } from './micLevel'

/**
 * Индикатор уровня входящего сигнала микрофона (ТП-118). Заполняется по
 * значению 0..1; цвет от приглушённого к зелёному по мере роста. Метка порога
 * показывает, с какого уровня сигнал считается уверенно слышимым.
 */
export function LevelMeter({ level }: { level: number }) {
  const value = Math.max(0, Math.min(1, level))
  const color =
    value >= 0.35 ? 'success.main' : value >= SIGNAL_THRESHOLD ? 'warning.main' : 'text.disabled'

  return (
    <Box
      role="meter"
      aria-label="Уровень сигнала микрофона"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number(value.toFixed(2))}
      sx={{
        position: 'relative',
        height: 12,
        borderRadius: 6,
        bgcolor: 'action.hover',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: `${value * 100}%`,
          bgcolor: color,
          borderRadius: 6,
          transition: 'width 80ms linear, background-color 200ms',
        }}
      />
      {/* Метка порога «уверенно слышно» */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${SIGNAL_THRESHOLD * 100}%`,
          width: '2px',
          bgcolor: 'divider',
        }}
      />
    </Box>
  )
}
