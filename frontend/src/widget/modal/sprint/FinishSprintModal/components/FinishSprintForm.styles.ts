import styled from '@emotion/styled'
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'

import { ShorSprintTask } from '@/entities/task/ui/SprintTask'

export const StyledShortSprintTask = styled(ShorSprintTask)`
  background-color: ${COLOR.background[200]};
`

export const TasksList = styled.ul`
  max-height: 200px;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: ${COLOR.background[100]};
  border-radius: 12px;
  padding: 8px;
`

export const TaskBlockTitle = styled.p`
  color: ${COLOR.text.secondary};
  ${TEXT_STYLES.headline.h3}
`

export const SprintSelectPlaceholder = styled.span`
  color: ${COLOR.text.lightGray400};
  ${TEXT_STYLES.body}
`
