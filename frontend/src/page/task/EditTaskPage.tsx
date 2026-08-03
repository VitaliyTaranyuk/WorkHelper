import { memo, useEffect, useRef, useState } from 'react'
import { Stack } from '@mui/material'
import { BackButton } from '@/features/navigation/BackButton'
import { useDeclareCurrentProject } from '@/features/project/model/currentProjectStore'
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

/**
 * G-4: проект приходит из адреса (`/project/$projectId/task/$code`), а не
 * подставляется «текущим». Раньше страница брала его из `useProjectData()`,
 * поэтому ссылка на задачу была двусмысленной: у получателя с другим текущим
 * проектом она открывала чужую задачу или 404.
 */
export const EditTaskPage = memo(function EditTaskPageInner({
  projectId,
  code,
}: {
  projectId: string
  code: string
}) {
  // Тот же шов, что у доски и бэклога: маршрут объявляет проект, а потребители
  // (в т.ч. TaskCardContent внутри) читают его из стора вкладки. Router-хук в
  // общем `useProjectData` уронил бы модалки, живущие вне роутера (**R-02**).
  useDeclareCurrentProject(projectId)

  const taskByCodeQuery = useTaskByCode({
    projectId,
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
      {fullTask && <TaskPageBody task={fullTask} projectId={projectId} />}
    </>
  )
})

function TaskPageBody({
  task,
  projectId,
}: {
  task: ITaskCard
  projectId: string
}) {
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
          // G-4: возврат на доску ИМЕННО этого проекта. Прежний `/main` вёл на
          // «последний открытый», и после удаления задачи из проекта, открытого
          // по ссылке, пользователь оказывался в чужом.
          onDeleted={() =>
            navigate({
              to: '/project/$projectId/board',
              params: { projectId },
            })
          }
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
