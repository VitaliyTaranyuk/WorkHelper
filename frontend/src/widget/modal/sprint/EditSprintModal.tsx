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
import { Button } from '@/shared/ui/Button'
import { useSprintForm } from '@/features/sprint/SprintForm/useSprintForm'
import { modalStyle } from '@/shared/ui/modalStyles'
import { SprintForm } from '@/features/sprint/SprintForm'
import { formatDateForBackend } from '@/shared/utils/date'
import { Spacer } from '@/shared/ui/Spacer'
import type { SprintFull } from '@/entities/sprint/type'
import { useEditSprint } from '@/features/sprint/mutation/useEditSprint'

export const EditSprintModal = NiceModal.create(EditSprintModalInner)

export type EditSprintModalProps = {
  projectId: string
  sprint: Pick<SprintFull, 'id' | 'name' | 'startDate' | 'endDate' | 'goal'>
}

function EditSprintModalInner(props: EditSprintModalProps) {
  const modal = useModal()
  const form = useSprintForm({ sprint: { ...props.sprint } })
  const editSprint = useEditSprint({
    sprintId: props.sprint.id,
    projectId: props.projectId,
  })

  const handleClose = () => {
    modal.reject()
    modal.hide()
  }

  const onSubmit = form.handleSubmit(async (formValues) => {
    // ТП-48: дата завершения выбирается в календаре напрямую
    // ТП-70: название опционально — пустое бэкенд хранит как null
    editSprint.mutateAsync({
      name: formValues.name?.trim() ?? '',
      ...(formValues.goal ? { goal: formValues.goal } : {}),
      ...(formValues.startDate
        ? { startDate: formatDateForBackend(formValues.startDate) }
        : {}),
      ...(formValues.endDate
        ? { endDate: formatDateForBackend(formValues.endDate) }
        : {}),
    })

    modal.resolve(formValues)
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
        Редактирование спринта
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={{ position: 'absolute', right: 32, top: 28 }}
        size="small"
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <DialogContent sx={{ padding: 0, marginTop: '16px', overflow: 'hidden' }}>
        <SprintForm onSubmit={onSubmit} form={form} />
      </DialogContent>
      <DialogActions sx={{ p: 0, mt: '13px' }}>
        <Stack gap={'18px'} direction={'row'} width={'100%'} height={'42px'}>
          <Button
            style={{ width: '50%' }}
            disabled={
              !form.formState.isValid ||
              !Object.keys(form.formState.dirtyFields).length
            }
            variant="primary"
            onClick={onSubmit}
          >
            Сохранить
          </Button>
          <Spacer />
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
