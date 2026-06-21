// TODO: подумать как красивее сделать, чтобы меньше бросалось в глаза и было структурировано проброс вызова модалки
import { useModal } from '@ebay/nice-modal-react'
import { Button, type ButtonProps } from '@/shared/ui/Button'
import CrossIcon from '@/shared/assets/icons/cross.svg?react'
import { COLOR } from '@/shared/ui/theme/constants'
import { CreateSprintModal } from '@/widget/modal/sprint'

type CreateSprintButtonProps = {
  size?: ButtonProps['size']
  onSuccess?: () => void
}

export function CreateSprintButton(props: CreateSprintButtonProps) {
  const modal = useModal(CreateSprintModal)

  return (
    <Button
      size={props.size}
      variant="secondary"
      onClick={async () => {
        await modal.show()
        if (props.onSuccess) props.onSuccess()
      }}
    >
      <CrossIcon fill={COLOR.main[500]} />
      Создать спринт
    </Button>
  )
}
