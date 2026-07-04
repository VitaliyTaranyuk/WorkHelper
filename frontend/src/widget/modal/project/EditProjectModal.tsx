import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/Button'
import { modalStyle } from '@/shared/ui/modalStyles'
import { useUpdateProject } from '@/features/project/mutation/useProjectActions'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'

type Props = {
  projectId: string
  name: string
  code: string
  description?: string
}

/** Редактирование проекта (ТП-54): название/код/описание, по образцу создания. */
export const EditProjectModal = NiceModal.create(
  ({ projectId, name: initialName, code: initialCode, description: initialDescription }: Props) => {
    const modal = useModal()
    const updateProject = useUpdateProject()
    const [name, setName] = useState(initialName)
    const [code, setCode] = useState(initialCode)
    const [description, setDescription] = useState(initialDescription ?? '')

    const valid = name.trim().length > 0 && code.trim().length > 0

    const close = () => {
      modal.reject()
      modal.hide()
    }

    const submit = async () => {
      if (!valid) return
      try {
        await updateProject.mutateAsync({
          projectId,
          data: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || undefined,
          },
        })
        toast.success('Проект обновлён')
        modal.resolve()
        modal.hide()
      } catch (err) {
        toast.error(extractGeneralError(err) ?? 'Не удалось обновить проект')
      }
    }

    return (
      <Dialog
        open={modal.visible}
        onClose={close}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: modalStyle.modalContainer } }}
        onTransitionExited={() => modal.remove()}
      >
        <DialogTitle sx={{ p: 0, fontSize: '24px', fontWeight: 500 }}>
          Редактировать проект
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
          <Stack gap={2}>
            <TextField
              label="Название"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
              autoFocus
            />
            <TextField
              label="Код (например TP)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: '16px' }}>
          <Button
            style={{ width: '50%' }}
            variant="primary"
            disabled={!valid || updateProject.isPending}
            onClick={submit}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    )
  },
)
