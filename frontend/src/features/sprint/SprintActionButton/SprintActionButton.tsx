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

type SprintButtonActionProps = {
  className?: string
  onSuccess?: () => void
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
