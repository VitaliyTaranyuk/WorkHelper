import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { sprintDisplayLabel } from '@/entities/sprint/label'
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
import { Spacer } from '@/shared/ui/Spacer'
import type { SprintFull } from '@/entities/sprint/type'
import { useProjectData } from '@/features/project/query/useProjectData'
import { SprintForm } from '@/features/sprint/SprintForm'
import { useActivateSprint } from '@/features/sprint/mutation/useActivateSprint'
import { assertIsDefined } from '@/shared/utils/typeChecking'

export const ActivateSprintModal = NiceModal.create(ActivateSprintModalInner)

export type ActivateSprintModalProps = {
  sprint: Pick<SprintFull, 'id' | 'name' | 'startDate' | 'endDate' | 'goal'>
}

function ActivateSprintModalInner(props: ActivateSprintModalProps) {
  const modal = useModal()
  const { activeProject } = useProjectData()
  const form = useSprintForm({ sprint: { ...props.sprint } })

  const activateSprint = useActivateSprint()

  const handleClose = () => {
    modal.reject()
    modal.hide()
  }

  const onSubmit = form.handleSubmit(async (formValues) => {
    assertIsDefined(activeProject)

    await activateSprint.mutateAsync({
      projectId: activeProject.id,
      sprintId: props.sprint.id,
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
        {sprintDisplayLabel(props.sprint)}
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
        <SprintForm onSubmit={onSubmit} form={form} isActivateMode />
      </DialogContent>
      <DialogActions sx={{ p: 0, mt: '13px' }}>
        <Stack gap={'18px'} direction={'row'} width={'100%'} height={'42px'}>
          <Button
            style={{ width: '50%' }}
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            variant="primary"
            onClick={onSubmit}
          >
            Начать
          </Button>
          <Spacer />
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
