import styled from '@emotion/styled'
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'
import { ButtonWithoutStyles } from '@/shared/ui/Button'

export const SprintTaskWrapper = styled.div`
  width: 100%;
  height: 32px;
  background-color: ${COLOR.background[100]};
  border-radius: 8px;
  padding: 0 8px;

  display: flex;
  align-items: center;
  gap: 8px;
`

export const LeftBlock = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
`

export const TaskEstimation = styled.p`
  // чтобы занимал всю ширину между блоками аватара и кнопкой на случай если число будет 2х, 3х значным
  width: 76px;
  margin: 0;
  padding: 0;

  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  ${TEXT_STYLES.storyPoint}
  color: ${COLOR.text.secondary};
`

export const IconButton = styled(ButtonWithoutStyles)`
  display: flex;
  align-items: center;
  justify-content: center;

  width: 16px;
  height: 16px;
`
export const TaskTitle = styled(ButtonWithoutStyles)`
  flex-grow: 1;
  text-align: left;
  ${TEXT_STYLES.body}
  color: ${COLOR.text.primary};

  overflow: hidden;
  text-overflow: ellipsis;
`
