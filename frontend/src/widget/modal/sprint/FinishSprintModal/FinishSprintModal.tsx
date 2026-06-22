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
import { modalStyle } from '@/shared/ui/modalStyles'
import { Spacer } from '@/shared/ui/Spacer'
import {
  FinishSprintForm,
  type ExternalSprintDataProps,
} from './components/FinishSprintForm'
import { useState } from 'react'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useFinishSprint } from '@/features/sprint/mutation/useFinishSprint'
import { useUpdateTasksSprint } from '@/features/task/mutation/useUpdateTasksSprint'

export const FinishSprintModal = NiceModal.create(FinishSprintModalInner)

export type FinishSprintModalProps = ExternalSprintDataProps & {
  projectId: string
}

function FinishSprintModalInner(props: FinishSprintModalProps) {
  const modal = useModal()
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const { activeProject } = useProjectData()
  const { data: sprints } = useSprintsInfoQuery({
    projectId: activeProject?.id,
  })
  const finishSprint = useFinishSprint()
  const updateTasksSprint = useUpdateTasksSprint()

  const notFinishedTasks = (props.sprint.tasks || []).filter(
    (task) => task.status !== activeProject?.resolveStatus,
  )

  const isSubmitting =
    finishSprint.isPending || updateTasksSprint.isPending

  const handleClose = () => {
    if (isSubmitting) return
    modal.reject()
    modal.hide()
  }

  const onSubmit = async () => {
    if (notFinishedTasks.length > 0) {
      await updateTasksSprint.mutateAsync({
        projectId: props.projectId,
        sprintId: selectedSprintId,
        taskIds: notFinishedTasks.map((task) => task.id),
      })
    }

    await finishSprint.mutateAsync({
      projectId: props.projectId,
      sprintId: props.sprint.id,
    })

    modal.resolve(selectedSprintId)
    modal.hide()
  }

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
        {props.sprint.name}
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
        <FinishSprintForm
          onSubmit={onSubmit}
          form={{ selectedSprintId, setSelectedSprintId }}
          sprint={props.sprint}
          notFinishedTasks={notFinishedTasks}
          availableSprints={(sprints || []).filter(
            (sprint) => sprint.id !== props.sprint.id,
          )}
        />
      </DialogContent>
      <DialogActions sx={{ p: 0, mt: '32px' }}>
        <Stack gap={'18px'} direction={'row'} width={'100%'} height={'42px'}>
          <Button
            style={{ width: '50%' }}
            disabled={!selectedSprintId || isSubmitting}
            variant="primary"
            onClick={onSubmit}
          >
            {isSubmitting ? 'Завершение...' : 'Завершить'}
          </Button>
          <Spacer />
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
