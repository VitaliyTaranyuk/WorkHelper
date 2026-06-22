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
import {
  useEditTaskForm,
  type CompactEditFormTask,
} from '@/features/task/TaskForm/useTaskForm'
import { sxStyle } from './TaskModal.styles'
import { MUIPrimaryButton } from '@/shared/ui/Button'
import { modalStyle } from '@/shared/ui/modalStyles'
import { useProjectData } from '@/features/project/query/useProjectData'
import { formatDateDDMMYYYY } from "@/shared/utils/date"
import { useEditTask } from '@/features/task/mutation/useEditTask'
import { assertIsDefined } from '@/shared/utils/typeChecking'

export const EditTaskModal = NiceModal.create(EditTaskModalInner)

type EditTaskModalInnerProps = {
  task: CompactEditFormTask
}

function EditTaskModalInner(props: EditTaskModalInnerProps) {
  const modal = useModal()
  const { activeProject } = useProjectData()
  const editTask = useEditTask()
  const form = useEditTaskForm({ task: props.task })

  const handleClose = () => {
    modal.reject()
    modal.hide()
  }

  const onSubmit = form.handleSubmit(async (formValues) => {
    assertIsDefined(activeProject)

    await editTask.mutateAsync({
      projectId: activeProject!.id,
      taskId: props.task.id,
      data: {
        priority: formValues.priority,

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
      },
    })

    modal.resolve(formValues)
    modal.hide()
  })

  const redirectPath = encodeURIComponent(window.location.pathname)

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
        {props.task.code}
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
          mode="edit"
          staticTaskInfo={{
            createdAt: formatDateDDMMYYYY(props.task.createdAt),
            creator: props.task.creator,
          }}
          onSubmit={onSubmit}
          form={form}
        />
      </DialogContent>
      <DialogActions sx={{ p: 0, mt: '13px' }}>
        <Stack gap={'18px'} direction={'row'} width={'100%'} height={'42px'}>
          <MUIPrimaryButton
            disabled={
              !form.formState.isValid ||
              !Object.keys(form.formState.dirtyFields).length
            }
            variant="contained"
            onClick={onSubmit}
            fullWidth
          >
            Сохранить
          </MUIPrimaryButton>
          <Button
            fullWidth
            component={Link}
            href={`/task/${props.task.code}?redirect=${redirectPath}`}
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
