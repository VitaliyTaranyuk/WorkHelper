import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { useRouter } from '@tanstack/react-router'

/**
 * Корневой запасной экран при краше рендера маршрута (ТП-131, TD-015).
 * Раньше исключение в компоненте роняло всё приложение в «Something went
 * wrong!» без выхода. Теперь — восстановимый экран: «Обновить» перемонтирует
 * поддерево, «На доску» уводит на главную.
 */
export function RouteErrorFallback({ error }: { error: Error }) {
  const router = useRouter()

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      gap={1.5}
      sx={{ minHeight: '60vh', textAlign: 'center', px: 3 }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
      <Typography sx={{ fontSize: 20, fontWeight: 600 }}>
        Что-то пошло не так
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: 14, maxWidth: 420 }}>
        Произошла ошибка при отображении страницы. Данные не потеряны — можно
        обновить экран или вернуться на доску.
      </Typography>
      {import.meta.env.DEV && error?.message && (
        <Typography
          component="pre"
          sx={{
            color: 'error.main',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            maxWidth: 480,
          }}
        >
          {error.message}
        </Typography>
      )}
      <Stack direction="row" gap={1} sx={{ mt: 1 }}>
        <Button variant="outlined" color="inherit" onClick={() => router.invalidate()}>
          Обновить
        </Button>
        <Button variant="contained" onClick={() => router.navigate({ to: '/main' })}>
          На доску
        </Button>
      </Stack>
    </Stack>
  )
}
