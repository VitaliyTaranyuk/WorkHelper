import { IconImg } from '@/shared/ui/IconImg'

import iconLook from '@/shared/assets/icons/look.svg'
import iconEdit from '@/shared/assets/icons/edit.svg'
import iconPlay from '@/shared/assets/icons/play.svg'
import iconStop from '@/shared/assets/icons/stop.svg'

import { IconButton } from './SprintActionButton.styled'
import { useModal } from '@ebay/nice-modal-react'
import {
  EditSprintModal,
  FinishSprintModal,
  type FinishSprintModalProps,
} from '@/widget/modal/sprint'
import type { EditSprintModalProps } from '@/widget/modal/sprint/EditSprintModal'
import {
  ActivateSprintModal,
  type ActivateSprintModalProps,
} from '@/widget/modal/sprint/ActivateSprintModal'
import { useNavigate } from '@tanstack/react-router'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import { usePauseSprint } from '@/features/sprint/mutation/usePauseSprint'
import { useResumeSprint } from '@/features/sprint/mutation/useResumeSprint'

type SprintButtonActionProps = {
  className?: string
  onSuccess?: () => void
}

type SprintIdActionProps = SprintButtonActionProps & {
  projectId: string
  sprintId: string
}

export function ViewSprintButton(props: SprintButtonActionProps) {
  const navigate = useNavigate()

  const onClick = () => {
    navigate({ to: '/main' })
    if (props.onSuccess) props.onSuccess()
  }

  return (
    <IconButton className={props.className} onClick={onClick}>
      <IconImg iconUrl={iconLook} iconAlt="перейти к доске активного спринта" />
    </IconButton>
  )
}

export function EditSprintButton(
  props: SprintButtonActionProps & { modalProps: EditSprintModalProps },
) {
  const modal = useModal(EditSprintModal)

  const onClick = async () => {
    await modal.show(props.modalProps)
    if (props.onSuccess) {
      props.onSuccess()
    }
  }

  return (
    <IconButton className={props.className} onClick={onClick}>
      <IconImg iconUrl={iconEdit} iconAlt="редактировать спринт" />
    </IconButton>
  )
}

export function FinishSprintButton(
  props: SprintButtonActionProps & { modalProps: FinishSprintModalProps },
) {
  const modal = useModal(FinishSprintModal)

  const onClick = async () => {
    await modal.show(props.modalProps)
    if (props.onSuccess) {
      props.onSuccess()
    }
  }

  return (
    <IconButton className={props.className} onClick={onClick}>
      <IconImg iconUrl={iconStop} iconAlt="завершить спринт" />
    </IconButton>
  )
}

export function StartSprintButton(
  props: SprintButtonActionProps & { modalProps: ActivateSprintModalProps },
) {
  const modal = useModal(ActivateSprintModal)

  const onClick = async () => {
    await modal.show(props.modalProps)
    if (props.onSuccess) {
      props.onSuccess()
    }
  }

  return (
    <IconButton className={props.className} onClick={onClick}>
      <IconImg iconUrl={iconPlay} iconAlt="запуск спринта" />
    </IconButton>
  )
}

export function PauseSprintButton(props: SprintIdActionProps) {
  const pauseSprint = usePauseSprint()

  const onClick = async () => {
    await pauseSprint.mutateAsync({
      projectId: props.projectId,
      sprintId: props.sprintId,
    })
    if (props.onSuccess) props.onSuccess()
  }

  return (
    <IconButton
      className={props.className}
      onClick={onClick}
      disabled={pauseSprint.isPending}
      title="Приостановить спринт"
    >
      <PauseRoundedIcon fontSize="small" />
    </IconButton>
  )
}

export function ResumeSprintButton(props: SprintIdActionProps) {
  const resumeSprint = useResumeSprint()

  const onClick = async () => {
    await resumeSprint.mutateAsync({
      projectId: props.projectId,
      sprintId: props.sprintId,
    })
    if (props.onSuccess) props.onSuccess()
  }

  return (
    <IconButton
      className={props.className}
      onClick={onClick}
      disabled={resumeSprint.isPending}
      title="Возобновить спринт"
    >
      <PlayArrowRoundedIcon fontSize="small" />
    </IconButton>
  )
}
