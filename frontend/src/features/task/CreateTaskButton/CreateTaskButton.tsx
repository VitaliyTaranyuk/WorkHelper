// TODO: подумать как красивее сделать, чтобы меньше бросалось в глаза и было структурировано проброс вызова модалки
import { CreateTaskModal } from '@/widget/modal/task'
import { useModal } from '@ebay/nice-modal-react'
import { Button, type ButtonProps } from '@/shared/ui/Button'
import CrossIcon from '@/shared/assets/icons/cross.svg?react'
import { COLOR } from '@/shared/ui/theme/constants'

type CreateTaskButtonProps = {
  size?: ButtonProps['size']
  onSuccess?: () => void
}

export function CreateTaskButton(props: CreateTaskButtonProps) {
  const modal = useModal(CreateTaskModal)
  return (
    <Button
      size={props.size}
      onClick={async () => {
        await modal.show()
        if (props.onSuccess) props.onSuccess()
      }}
    >
      <CrossIcon fill={COLOR.text.light} />
      Создать задачу
    </Button>
  )
}
