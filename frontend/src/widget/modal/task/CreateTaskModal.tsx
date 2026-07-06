import { useEffect, useState } from 'react'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { CreateTaskContent } from '@/features/task/CreateTaskContent'
import { useCreateTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { modalStyle } from '@/shared/ui/modalStyles'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'
import { uploadPendingAttachments } from '@/features/task/uploadPendingAttachments'
import { Loader } from '@/shared/ui/components/Loader'

export const CreateTaskModal = NiceModal.create(CreateTaskModalInner)

function CreateTaskModalInner() {
  const modal = useModal()
  const { activeProject } = useProjectData()
  const { data: sprints, isLoading: isSprintsLoading } = useSprintsInfoQuery({
    projectId: activeProject?.id,
  })
  const createTask = useCreateTask()
  // window.location, а не useRouterState: NiceModal-провайдер смонтирован вне
  // RouterProvider, router-хуки внутри модалки падают. Модалка открывается
  // поверх готовой страницы, поэтому реактивность по маршруту не нужна.
  const pathname = window.location.pathname

  // Спринт по контексту раздела (ТП-12): из раздела Backlog задача создаётся
  // в Backlog, из остальных разделов (доска, спринты) — в активный спринт,
  // чтобы созданная задача сразу появлялась на доске. Если активного спринта
  // нет — фоллбэк в Backlog.
  const defaultSprint = (sprints || []).find((sprint) => sprint.isDefault)
  const activeSprint = (sprints || []).find((sprint) => sprint.isActive)
  const isBacklogContext = pathname.endsWith('/backlog')
  const preferredSprintId =
    (isBacklogContext ? defaultSprint?.id : activeSprint?.id) ??
    defaultSprint?.id ??
    ''

  const form = useCreateTaskForm({
    defaultSprintId: preferredSprintId,
  })

  // Отложенные вложения (ТП-30): грузятся к задаче сразу после создания.
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Список спринтов мог прийти после первого рендера формы (холодный кэш) —
  // проставляем контекстный спринт, пока пользователь его не менял.
  useEffect(() => {
    if (!form.getValues('sprint') && preferredSprintId) {
      form.setValue('sprint', preferredSprintId, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredSprintId])

  const handleClose = () => {
    modal.reject()
    modal.hide()
  }

  const onSubmit = form.handleSubmit(async (formValues) => {
    const created = await createTask.mutateAsync({
      priority: formValues.priority,
      projectId: activeProject!.id,
      taskType: formValues.type,
      title: formValues.taskTitle,
      sprintId: formValues.sprint,

      ...(formValues.description
        ? { description: formValues.description }
        : {}),
      ...(formValues.assignee === '-1'
        ? {}
        : { assignee: formValues.assignee }),
      // Выбранная колонка доски (ТП-36); для Backlog-спринта поле обнулено
      ...(formValues.status != null ? { statusId: formValues.status } : {}),
    })

    // Вложения (ТП-30): задача уже создана, ошибки загрузки не отменяют её.
    await uploadPendingAttachments(
      activeProject!.id,
      created.data.id,
      pendingFiles,
    )

    modal.resolve()
    modal.hide()
  })

  return (
    <Dialog
      open={modal.visible}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: modalStyle.modalContainer } }}
      onTransitionExited={() => {
        modal.remove()
      }}
    >
      <DialogTitle sx={{ padding: '0', fontSize: '24px', fontWeight: 500 }}>
        Новая задача
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={{ position: 'absolute', right: 32, top: 28 }}
        size="small"
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <DialogContent
        sx={{ padding: 0, marginTop: '16px', overflowY: 'auto' }}
      >
        {isSprintsLoading ? (
          <Loader isLoading />
        ) : (
          <CreateTaskContent
            onSubmit={onSubmit}
            form={form}
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ p: 0, mt: '13px' }}>
        <Stack gap={'18px'} direction={'row'} width={'100%'} height={'42px'}>
          {/* ТП-136 (F-008): кнопку не блокируем по !isValid — иначе клик по
              пустой форме молча игнорировался (мёртвая кнопка). handleSubmit
              сам покажет ошибку у поля «Название». */}
          <MUIPrimaryButton
            disabled={form.formState.isSubmitting}
            variant="contained"
            onClick={onSubmit}
            fullWidth
          >
            Создать
          </MUIPrimaryButton>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
