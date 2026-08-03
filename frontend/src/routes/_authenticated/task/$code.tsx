import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEntryProjectId } from '@/features/project/query/useProjectData'
import { TaskCardSkeleton } from '@/features/task/TaskCardSkeleton'

/**
 * G-4: адрес задачи без проекта сохранён и только НОРМАЛИЗУЕТСЯ.
 *
 * Канонический адрес — `/project/$projectId/task/$code`. Этот маршрут остаётся
 * потому, что на него ведут уже разосланные ссылки и четыре места голосового
 * модуля (`useVoiceServices`, `VoiceOverlay`, `VoiceJournalButton`,
 * `useVoicePractice`). Переписывать их ради нового адреса значило бы тронуть
 * подсистему, к задаче не относящуюся (**K-23**), — редирект решает то же самое
 * в одном месте, и после него в адресной строке остаётся однозначная ссылка,
 * которую можно передать.
 *
 * Семантика прежняя: проект берётся тот же, что подставлялся раньше
 * (контекст вкладки → последний открытый → первый доступный). Задача не в том,
 * чтобы поменять, КУДА ведёт старая ссылка, а в том, чтобы новые ссылки
 * перестали быть двусмысленными.
 */
export const Route = createFileRoute('/_authenticated/task/$code')({
  component: RouteComponent,
})

function RouteComponent() {
  const { code } = Route.useParams()
  const navigate = useNavigate()
  const { projectId, isLoading } = useEntryProjectId()

  useEffect(() => {
    if (!projectId) return
    navigate({
      to: '/project/$projectId/task/$code',
      params: { projectId, code },
      replace: true,
    })
  }, [projectId, code, navigate])

  // Пользователь без проектов: экран, умеющий быть пустым, обязан отличать
  // «пусто» от «не загрузилось» (**W-06**) — вечный каркас здесь был бы ровно
  // молчаливым отказом.
  if (!isLoading && !projectId)
    return (
      <Stack alignItems="center" justifyContent="center" gap={1} sx={{ py: 8 }}>
        <Typography variant="h6">Задачу {code} открыть не в чем</Typography>
        <Typography variant="body2" color="text.secondary">
          У вас пока нет ни одного проекта. Создайте проект в меню слева вверху
          или попросите пригласить вас в существующий.
        </Typography>
      </Stack>
    )

  // Каркас вместо спиннера (F-01): переход обычно происходит в том же кадре,
  // что и ответ о проекте.
  return <TaskCardSkeleton />
}
