import { Box, Stack, Typography, keyframes } from '@mui/material'

/**
 * Живая расшифровка речи под полем (ТП-241).
 *
 * Две зоны с РАЗНЫМ смыслом, и это главное в компоненте:
 *  - `final` — распознанное окончательно, обычным текстом;
 *  - `interim` — то, что браузер ещё уточняет: курсивом и приглушённо.
 * Пользователь по ходу речи видит, что услышано, и отличает готовое от
 * «додумывается». В поле всё это попадёт обычным текстом — когда он закончит
 * сессию (Enter), что и служит сигналом «аудионабор завершён».
 *
 * Панель показывается ТОЛЬКО во время записи: пустая рамка под каждым полем
 * описания — мёртвый UI (F-04).
 */

const pulse = keyframes`
  0%   { opacity: 1;   transform: scale(1); }
  50%  { opacity: 0.35; transform: scale(0.8); }
  100% { opacity: 1;   transform: scale(1); }
`

export function DictationLivePanel({
  final,
  interim,
  onFinish,
  onCancel,
}: {
  final: string
  interim: string
  onFinish: () => void
  onCancel: () => void
}) {
  const hasText = Boolean(final || interim)

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Идёт диктовка"
      sx={{
        border: '1px solid',
        borderColor: 'error.main',
        borderRadius: '8px',
        padding: '8px 10px',
        backgroundColor: 'action.hover',
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} mb={hasText ? 0.75 : 0}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'error.main',
            animation: `${pulse} 1.2s ease-in-out infinite`,
          }}
        />
        <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 500 }}>
          Идёт диктовка
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ml: 'auto', textAlign: 'right' }}
        >
          <Box component="span" sx={{ cursor: 'pointer' }} onClick={onFinish}>
            Enter — вставить
          </Box>
          {' · '}
          <Box component="span" sx={{ cursor: 'pointer' }} onClick={onCancel}>
            Esc — отменить
          </Box>
        </Typography>
      </Stack>

      {hasText ? (
        <Typography
          variant="body2"
          sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {final}
          {final && interim ? ' ' : ''}
          {/* Уточняемый фрагмент — курсивом и приглушённо: видно, что он ещё
              может измениться, а окончательное уже не изменится. */}
          <Box component="span" sx={{ fontStyle: 'italic', opacity: 0.6 }}>
            {interim}
          </Box>
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Говорите — текст появится здесь
        </Typography>
      )}
    </Box>
  )
}
