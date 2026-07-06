// TODO: подумать как красивее сделать, чтобы меньше бросалось в глаза и было структурировано проброс вызова модалки
import styled from '@emotion/styled'
import { CreateTaskModal } from '@/widget/modal/task'
import { useModal } from '@ebay/nice-modal-react'
import { Button, type ButtonProps } from '@/shared/ui/Button'
import CrossIcon from '@/shared/assets/icons/cross.svg?react'
import { COLOR } from '@/shared/ui/theme/constants'

type CreateTaskButtonProps = {
  size?: ButtonProps['size']
  onSuccess?: () => void
}

// ТП-134 (F-011): на телефоне подпись скрыта — кнопка становится компактной
// (иконка «+»), чтобы шапка помещалась и не выталкивала колокольчик/меню.
const ButtonLabel = styled.span`
  @media (max-width: 640px) {
    display: none;
  }
`

export function CreateTaskButton(props: CreateTaskButtonProps) {
  const modal = useModal(CreateTaskModal)
  return (
    <Button
      size={props.size}
      aria-label="Создать задачу"
      onClick={async () => {
        await modal.show()
        if (props.onSuccess) props.onSuccess()
      }}
    >
      <CrossIcon fill={COLOR.text.light} />
      <ButtonLabel>Создать задачу</ButtonLabel>
    </Button>
  )
}
