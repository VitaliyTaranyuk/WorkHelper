import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { modalStyle } from '@/shared/ui/modalStyles'

type Props = {
  title: string
  label: string
  initialValue?: string
  submitLabel?: string
}

/**
 * Диалог одного текстового поля в стиле модалок WorkTask (ТП-69) — замена
 * системного window.prompt. Использование:
 *   const value = await NiceModal.show(TextPromptDialog, { title, label })
 * Возвращает введённую строку; отмена/закрытие — reject (ловить try/catch).
 */
export const TextPromptDialog = NiceModal.create(
  ({ title, label, initialValue = '', submitLabel = 'Сохранить' }: Props) => {
    const modal = useModal()
    const [value, setValue] = useState(initialValue)
    const valid = value.trim().length > 0

    const close = () => {
      modal.reject()
      modal.hide()
    }

    const submit = () => {
      if (!valid) return
      modal.resolve(value.trim())
      modal.hide()
    }

    return (
      <Dialog
        open={modal.visible}
        onClose={close}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: modalStyle.modalContainer } }}
        onTransitionExited={() => modal.remove()}
      >
        <DialogTitle sx={{ p: 0, fontSize: '24px', fontWeight: 500 }}>
          {title}
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={close}
          sx={{ position: 'absolute', right: 32, top: 28 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={modalStyle.modalContent}>
          <TextField
            label={label}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: '16px' }}>
          <Button
            style={{ width: '50%' }}
            variant="primary"
            disabled={!valid}
            onClick={submit}
          >
            {submitLabel}
          </Button>
        </DialogActions>
      </Dialog>
    )
  },
)
