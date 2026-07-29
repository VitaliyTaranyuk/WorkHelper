import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEntryProjectId } from '@/features/project/query/useProjectData'
import { SkeletonLine } from '@/shared/ui/components/Skeleton'

/**
 * Точка входа «на доску» (T-518).
 *
 * Сам адрес проекта не содержит, поэтому страница только определяет, куда
 * идти: контекст вкладки → последний проект пользователя → первый доступный,
 * и перенаправляет на `/project/$projectId/board`. Маршрут сохранён намеренно:
 * на `/main` ведут четырнадцать мест (логин, приглашение, встреча, голосовые
 * команды, кнопка «назад»), и переписывать их ради нового адреса значило бы
 * тронуть половину приложения (**K-23**).
 */
export const Route = createFileRoute('/_authenticated/main')({
  component: BoardEntryPage,
})

function BoardEntryPage() {
  const navigate = useNavigate()
  const { projectId, isLoading } = useEntryProjectId()

  useEffect(() => {
    if (!projectId) return
    navigate({
      to: '/project/$projectId/board',
      params: { projectId },
      replace: true,
    })
  }, [projectId, navigate])

  // Пока ищем проект — каркас вместо спиннера (F-01); переход обычно
  // происходит в том же кадре, что и ответ.
  if (isLoading || projectId)
    return (
      <Stack gap={1} sx={{ p: 2 }}>
        <SkeletonLine width="30%" height={28} />
        <SkeletonLine height={120} />
        <SkeletonLine height={120} />
      </Stack>
    )

  // Пользователь без проектов — состояние достижимое (регистрация, выход из
  // последнего проекта). Пустой экран без объяснений здесь был бы ровно тем
  // молчаливым отказом, который запрещает W-06.
  return (
    <Stack alignItems="center" justifyContent="center" gap={1} sx={{ py: 8 }}>
      <Typography variant="h6">Проектов пока нет</Typography>
      <Typography variant="body2" color="text.secondary">
        Создайте проект в меню слева вверху — доска появится сразу после этого.
      </Typography>
    </Stack>
  )
}
