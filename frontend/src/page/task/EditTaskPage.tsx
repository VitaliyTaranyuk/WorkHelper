import { memo, useEffect, useRef, useState } from 'react'
import { Stack } from '@mui/material'
import { BackButton } from '@/features/navigation/BackButton'
import { useProjectData } from '@/features/project/query/useProjectData'
import { Loader } from '@/shared/ui/components/Loader'
import { Headline } from './styles'
import { useTaskByCode } from '@/features/task/query/useTaskByCode'
import {
  TaskCardContent,
  type TaskCardGuard,
} from '@/features/task/TaskCardContent'
import { UnsavedChangesGuardDialog } from '@/features/task/UnsavedChangesGuardDialog'
import { useBlocker, useNavigate } from '@tanstack/react-router'
import type { ITaskCard } from '@/entities/task/types'

export const EditTaskPage = memo(function EditTaskPageInner({
  code,
}: {
  code: string
}) {
  const { activeProject } = useProjectData()

  const taskByCodeQuery = useTaskByCode({
    projectId: activeProject?.id,
    taskCode: code,
  })

  // ТП-201: плейсхолдер из кэша списков (ТП-185) без тела описания — форму
  // редактирования монтируем ТОЛЬКО на реальных данных, иначе описание пусто
  // и правки идут поверх невидимого текста.
  const fullTask = taskByCodeQuery.isPlaceholderData
    ? undefined
    : taskByCodeQuery.data

  return (
    <>
      <BackButton />

      {!fullTask && !taskByCodeQuery.isError && <Loader isLoading={true} />}
      {fullTask && <TaskPageBody task={fullTask} />}
    </>
  )
})

function TaskPageBody({ task }: { task: ITaskCard }) {
  const navigate = useNavigate()
  // ТП-195: та же защита несохранённых изменений (ТП-34), что и в
  // TaskCardModal, — карточка ведёт себя одинаково и в модалке, и на
  // полной странице (уход по deep-link/уведомлению не должен молча терять
  // правки). beforeunload (закрытие вкладки/перезагрузка) уже покрыт внутри
  // самого TaskCardContent — здесь только SPA-переходы (сайдбар, назад).
  const guardRef = useRef<TaskCardGuard | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const blocker = useBlocker({
    shouldBlockFn: () => Boolean(guardRef.current?.isDirty),
    enableBeforeUnload: false,
    withResolver: true,
  })

  useEffect(() => {
    if (blocker.status === 'blocked') setConfirmOpen(true)
  }, [blocker.status])

  const forceProceed = () => {
    setConfirmOpen(false)
    blocker.proceed?.()
  }

  const handleSaveAndProceed = async () => {
    if (!guardRef.current) return forceProceed()
    setSaving(true)
    try {
      const ok = await guardRef.current.save()
      if (ok) {
        forceProceed()
      } else {
        // Ошибка сохранения: остаёмся на странице, причина уже показана
        // рядом с полем или в toast.
        setConfirmOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack mt={'10px'}>
      <Headline>{task.code}</Headline>
      <Stack mt={2}>
        <TaskCardContent
          task={task}
          onDeleted={() => navigate({ to: '/main' })}
          guardRef={guardRef}
        />
      </Stack>
      <UnsavedChangesGuardDialog
        open={confirmOpen}
        code={task.code}
        saving={saving}
        onDiscard={forceProceed}
        onSave={handleSaveAndProceed}
        onCancel={() => {
          setConfirmOpen(false)
          blocker.reset?.()
        }}
      />
    </Stack>
  )
}
