import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Link,
  Stack,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import MoreIcon from '@/shared/assets/icons/more.svg?react'
import { CompactTaskForm } from '@/features/task/TaskForm/CompactTaskForm'
import { useCreateTaskForm } from '@/features/task/TaskForm/useTaskForm'
import { sxStyle } from './TaskModal.styles'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { modalStyle } from '@/shared/ui/modalStyles'
import { useSprintsInfoQuery } from '@/features/sprint/query/useSprintsInfoQuery'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useCreateTask } from '@/features/task/mutation/useCreateTask'

export const CreateTaskModal = NiceModal.create(CreateTaskModalInner)

function CreateTaskModalInner() {
  const modal = useModal()
  const { activeProject } = useProjectData()
  const { data: sprints } = useSprintsInfoQuery({
    projectId: activeProject?.id,
  })
  const createTask = useCreateTask()

  const form = useCreateTaskForm({
    defaultSprintId: (sprints || []).find((sprint) => sprint.isDefault)!.id,
  })

  const handleClose = () => {
    modal.reject()
    modal.hide()
  }

  const redirectPath = encodeURIComponent(window.location.pathname)

  const onSubmit = form.handleSubmit(async (formValues) => {
    await createTask.mutateAsync({
      priority: formValues.priority,
      projectId: activeProject!.id,
      taskType: formValues.type,
      title: formValues.taskTitle,
      sprintId: formValues.sprint,

      ...(formValues.estimation ? { estimation: formValues.estimation } : {}),

      ...(formValues.description
        ? { description: formValues.description }
        : {}),
      ...(formValues.assignee === '-1'
        ? {}
        : { assignee: formValues.assignee }),
    })

    modal.resolve()
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
        Новая задача
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
        <CompactTaskForm
          mode="create"
          // TODO: сделать отдельный стор для user, в useAuth оставить только isAuthenticated
          onSubmit={onSubmit}
          form={form}
        />
      </DialogContent>
      <DialogActions sx={{ p: 0, mt: '13px' }}>
        <Stack gap={'18px'} direction={'row'} width={'100%'} height={'42px'}>
          <MUIPrimaryButton
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            variant="contained"
            onClick={onSubmit}
            fullWidth
          >
            Создать
          </MUIPrimaryButton>
          <Button
            fullWidth
            component={Link}
            href={`/task/create?redirect=${redirectPath}`}
            target="_blank"
            variant="outlined"
            endIcon={<MoreIcon />}
            sx={sxStyle.linkButton}
          >
            Расширенная версия
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
