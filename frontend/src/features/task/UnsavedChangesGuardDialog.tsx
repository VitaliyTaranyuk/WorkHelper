import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

type Props = {
  open: boolean
  code: string
  saving: boolean
  /** Отменить изменения и продолжить закрытие/переход. */
  onDiscard: () => void
  /** Сохранить перед закрытием/переходом. */
  onSave: () => void
  /** Остаться в карточке (клик мимо/Escape). */
  onCancel: () => void
}

/**
 * ТП-34/ТП-195: единый диалог подтверждения потери несохранённых изменений —
 * используется и модалкой (TaskCardModal), и полной страницей (EditTaskPage),
 * чтобы поведение при закрытии/уходе было идентичным в обоих контекстах.
 */
export function UnsavedChangesGuardDialog({
  open,
  code,
  saving,
  onDiscard,
  onSave,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs">
      <DialogTitle>Несохранённые изменения</DialogTitle>
      <DialogContent>
        <DialogContentText>
          В задаче {code} есть несохранённые изменения. Сохранить их перед
          закрытием?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onDiscard} disabled={saving}>
          Отменить изменения и закрыть
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>
          Сохранить изменения
        </Button>
      </DialogActions>
    </Dialog>
  )
}
