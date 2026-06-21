import styled from '@emotion/styled'
import { ButtonWithoutStyles } from '@/shared/ui/Button'
import { COLOR } from '@/shared/ui/theme/constants'

export const ACTION_BUTTON_SIZE = '28px'

export const IconButton = styled(ButtonWithoutStyles)`
  width: ${ACTION_BUTTON_SIZE};
  height: ${ACTION_BUTTON_SIZE};

  padding: 6px;
  border: 1px solid ${COLOR.main[350]};
  border-radius: 9px;
  background-color: ${COLOR.main[75]};

  display: flex;
  align-items: center;
  justify-content: center;
`
