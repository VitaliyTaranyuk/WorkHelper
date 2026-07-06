import { useRef, useState } from 'react'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { ITaskCard } from '@/entities/task/types'
import {
  TaskCardContent,
  type TaskCardGuard,
} from '@/features/task/TaskCardContent'
import { TaskCardLoadError } from '@/features/task/TaskCardLoadError'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useTaskByCode } from '@/features/task/query/useTaskByCode'
import { Loader } from '@/shared/ui/components/Loader'

/**
 * ТП-89: карточку можно открыть либо по объекту задачи (доска/список), либо
 * по коду (уведомления) — единый компонент/модалка вместо отдельной страницы.
 */
export type TaskCardModalProps = {
  task?: ITaskCard
  taskCode?: string
}

/**
 * Единственная карточка задачи. Открывается поверх текущего интерфейса,
 * занимает большую часть экрана, адаптивна. Заменяет прежние EditTaskModal
 * (компактная) и ExpandedTaskModal (расширенная) — никакого разделения.
 *
 * ТП-34: при закрытии с несохранёнными изменениями показывается диалог
 * «Сохранить изменения / Отменить изменения и закрыть» (паттерн Jira/Linear).
 */
export const TaskCardModal = NiceModal.create(
  ({ task: taskProp, taskCode }: TaskCardModalProps) => {
    const modal = useModal()
    const guardRef = useRef<TaskCardGuard | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // ТП-89: если передан только код (из уведомлений) — грузим задачу по коду;
    // с доски/списка задача уже есть, запрос не выполняется.
    const { activeProject } = useProjectData()
    const byCode = useTaskByCode({
      projectId: activeProject?.id,
      taskCode: taskProp ? undefined : taskCode,
    })
    const task = taskProp ?? byCode.data
    const code = task?.code ?? taskCode ?? ''

    const forceClose = () => {
      setConfirmOpen(false)
      modal.reject()
      modal.hide()
    }

    const handleClose = () => {
      if (guardRef.current?.isDirty) {
        setConfirmOpen(true)
        return
      }
      forceClose()
    }

    const handleSaveAndClose = async () => {
      if (!guardRef.current) return forceClose()
      setSaving(true)
      try {
        const ok = await guardRef.current.save()
        if (ok) {
          forceClose()
        } else {
          // Ошибка сохранения: остаёмся в карточке, причина уже показана
          // рядом с полем или в toast.
          setConfirmOpen(false)
        }
      } finally {
        setSaving(false)
      }
    }

    return (
      <Dialog
        open={modal.visible}
        onClose={handleClose}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: '92vw' },
              height: { xs: '100%', sm: '88vh' },
              maxWidth: '1280px',
              maxHeight: { xs: '100%', sm: '92vh' },
              m: { xs: 0, sm: 2 },
              borderRadius: { xs: 0, sm: '16px' },
              backgroundColor: 'var(--wt-bg)',
              boxShadow: 'var(--wt-shadow-modal)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
        onTransitionExited={() => modal.remove()}
      >
        <DialogTitle
          sx={{ padding: '20px 28px', fontSize: '24px', fontWeight: 500, flexShrink: 0 }}
        >
          {code}
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 20, top: 18 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
          {task ? (
            <TaskCardContent task={task} onDeleted={forceClose} guardRef={guardRef} />
          ) : byCode.isError ? (
            // ТП-130 (F-002): раньше ошибка загрузки по коду оставляла вечный
            // спиннер поверх интерфейса (клик по уведомлению удалённой задачи).
            <TaskCardLoadError
              code={code}
              error={byCode.error}
              onRetry={() => byCode.refetch()}
              onClose={forceClose}
            />
          ) : (
            <Loader isLoading />
          )}
        </DialogContent>

        {/* Guard несохранённых изменений (ТП-34). Клик мимо/Escape —
            вернуться к редактированию. */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
          <DialogTitle>Несохранённые изменения</DialogTitle>
          <DialogContent>
            <DialogContentText>
              В задаче {code} есть несохранённые изменения. Сохранить их
              перед закрытием?
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={forceClose} disabled={saving}>
              Отменить изменения и закрыть
            </Button>
            <Button variant="contained" onClick={handleSaveAndClose} disabled={saving}>
              Сохранить изменения
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
    )
  },
)
