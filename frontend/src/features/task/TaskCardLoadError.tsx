import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

/**
 * Состояние ошибки загрузки задачи по коду (ТП-130, находка F-002 аудита):
 * раньше при 404 карточка показывала вечный спиннер. 404 — задача удалена
 * (типовой случай: клик по уведомлению удалённой задачи); прочие ошибки —
 * временные, даём повторить.
 */
export function TaskCardLoadError({
  code,
  error,
  onRetry,
  onClose,
}: {
  code: string
  error: unknown
  onRetry: () => void
  onClose: () => void
}) {
  const status = (error as { response?: { status?: number } })?.response?.status
  const notFound = status === 404

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      gap={1.5}
      sx={{ height: '100%', minHeight: 240, textAlign: 'center', px: 3 }}
    >
      {notFound ? (
        <SearchOffIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      ) : (
        <ErrorOutlineIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      )}
      <Typography sx={{ fontSize: 18, fontWeight: 500 }}>
        {notFound
          ? `Задача ${code} не найдена`
          : `Не удалось загрузить задачу ${code}`}
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
        {notFound
          ? 'Возможно, она была удалена или перенесена в другой проект.'
          : 'Проверьте соединение и попробуйте ещё раз.'}
      </Typography>
      <Stack direction="row" gap={1} sx={{ mt: 1 }}>
        {!notFound && (
          <Button variant="outlined" color="inherit" onClick={onRetry}>
            Повторить
          </Button>
        )}
        <Button variant="contained" onClick={onClose}>
          Закрыть
        </Button>
      </Stack>
    </Stack>
  )
}
