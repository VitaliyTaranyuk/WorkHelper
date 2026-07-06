import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { Button } from '@/shared/ui/Button'
import { modalStyle } from '@/shared/ui/modalStyles'

type ConfirmDialogProps = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Опасное действие (удаление): подтверждающая кнопка красная. */
  destructive?: boolean
}

/**
 * Диалог подтверждения в стиле модалок WorkTask (ТП-133, находка F-007 аудита)
 * — замена системного window.confirm, который блокирует поток, не тематизируется
 * и рассинхронён с остальными подтверждениями приложения.
 *
 * Использование:
 *   const ok = await confirmDialog({ title, message, destructive: true })
 *   if (!ok) return
 *
 * Подтверждение → resolve(true), отмена/Escape/клик мимо → resolve(false).
 */
export const ConfirmDialog = NiceModal.create(
  ({
    title,
    message,
    confirmLabel = 'Подтвердить',
    cancelLabel = 'Отмена',
    destructive = false,
  }: ConfirmDialogProps) => {
    const modal = useModal()

    const resolveWith = (value: boolean) => {
      modal.resolve(value)
      modal.hide()
    }

    return (
      <Dialog
        open={modal.visible}
        onClose={() => resolveWith(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: modalStyle.modalContainer } }}
        onTransitionExited={() => modal.remove()}
      >
        <DialogTitle sx={{ p: 0, fontSize: '22px', fontWeight: 500 }}>
          {title}
        </DialogTitle>
        <DialogContent sx={{ ...modalStyle.modalContent, pb: 0 }}>
          <DialogContentText sx={{ color: 'text.secondary', fontSize: 15 }}>
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: '20px', gap: '12px' }}>
          <Button
            style={{ width: '50%' }}
            variant="secondary"
            onClick={() => resolveWith(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            style={{
              width: '50%',
              ...(destructive
                ? { backgroundColor: '#D93A3A', borderColor: '#D93A3A' }
                : {}),
            }}
            variant="primary"
            autoFocus
            onClick={() => resolveWith(true)}
          >
            {confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    )
  },
)

/**
 * Императивный помощник: `if (!(await confirmDialog({...}))) return`.
 * Промис никогда не реджектится — отмена = `false`, поэтому try/catch не нужен.
 */
export function confirmDialog(props: ConfirmDialogProps): Promise<boolean> {
  return NiceModal.show(ConfirmDialog, props) as Promise<boolean>
}
