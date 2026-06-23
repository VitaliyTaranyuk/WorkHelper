import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { ITaskCard } from '@/entities/task/types'
import { EditTaskDetails } from '@/features/task/EditTaskDetails'
import { CreateTaskDetails } from '@/features/task/CreateTaskDetails'

export type ExpandedTaskModalProps =
  | { mode: 'edit'; task: ITaskCard }
  | { mode: 'create'; projectId: string; defaultSprintId: string }

export const ExpandedTaskModal = NiceModal.create(
  (props: ExpandedTaskModalProps) => {
    const modal = useModal()

    const handleClose = () => {
      modal.reject()
      modal.hide()
    }

    const title =
      props.mode === 'edit' ? props.task.code : 'Новая задача'

    return (
      <Dialog
        open={modal.visible}
        onClose={handleClose}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              // 80–95% экрана с адаптивным масштабированием (ноутбуки, большие
              // мониторы, планшеты). На мобильных — почти полноэкранно.
              width: { xs: '100%', sm: '90vw' },
              height: { xs: '100%', sm: '90vh' },
              maxWidth: '1400px',
              maxHeight: { xs: '100%', sm: '95vh' },
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
        onTransitionExited={() => {
          modal.remove()
        }}
      >
        <DialogTitle
          sx={{
            padding: '20px 28px',
            fontSize: '24px',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {title}
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 20, top: 18 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        {/* Внутренний скролл внутри модального окна; фон под ним не прокручивается. */}
        <DialogContent sx={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
          {props.mode === 'edit' ? (
            <EditTaskDetails task={props.task} onDeleted={handleClose} />
          ) : (
            <CreateTaskDetails
              projectId={props.projectId}
              defaultSprintId={props.defaultSprintId}
              onSuccess={() => {
                modal.resolve()
                modal.hide()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    )
  },
)
