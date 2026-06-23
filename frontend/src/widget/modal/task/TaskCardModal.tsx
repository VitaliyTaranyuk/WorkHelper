import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { ITaskCard } from '@/entities/task/types'
import { TaskCardContent } from '@/features/task/TaskCardContent'

export type TaskCardModalProps = {
  task: ITaskCard
}

/**
 * Единственная карточка задачи. Открывается поверх текущего интерфейса,
 * занимает большую часть экрана, адаптивна. Заменяет прежние EditTaskModal
 * (компактная) и ExpandedTaskModal (расширенная) — никакого разделения.
 */
export const TaskCardModal = NiceModal.create(
  ({ task }: TaskCardModalProps) => {
    const modal = useModal()

    const handleClose = () => {
      modal.reject()
      modal.hide()
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
              backgroundColor: 'rgba(224, 228, 234, 1)',
              boxShadow: '0 12px 40px rgba(17,24,39,.18)',
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
          {task.code}
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
          <TaskCardContent task={task} onDeleted={handleClose} />
        </DialogContent>
      </Dialog>
    )
  },
)
