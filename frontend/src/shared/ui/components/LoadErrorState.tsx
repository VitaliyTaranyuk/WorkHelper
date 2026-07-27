import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

/**
 * Ошибка загрузки данных экрана (список задач, доска).
 *
 * Инцидент 2026-07-28 показал класс дефекта: запрос падал, а экран молча
 * рендерил пустоту — пользователь видел «задачи пропали» и не имел ни
 * объяснения, ни способа повторить. Экран, который умеет быть пустым,
 * ОБЯЗАН отличать «пусто» от «не загрузилось».
 *
 * Тон и структура — как у `TaskCardLoadError` (ТП-130): что случилось,
 * что делать, кнопка повтора.
 */
export function LoadErrorState({
  title,
  hint = 'Проверьте соединение и попробуйте ещё раз.',
  onRetry,
}: {
  title: string
  hint?: string
  onRetry?: () => void
}) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      gap={1.5}
      sx={{ minHeight: 240, textAlign: 'center', px: 3 }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      <Typography sx={{ fontSize: 18, fontWeight: 500 }}>{title}</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
        {hint}
      </Typography>
      {onRetry && (
        <Button variant="outlined" color="inherit" onClick={onRetry} sx={{ mt: 1 }}>
          Повторить
        </Button>
      )}
    </Stack>
  )
}
