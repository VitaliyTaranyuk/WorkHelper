import styled from '@emotion/styled'

import { css } from '@emotion/react'
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'
import { ButtonWithoutStyles } from '@/shared/ui/Button'
import { ACTION_BUTTON_SIZE } from '@/features/sprint/SprintActionButton'

const RIGHT_PART_GAP_PX = '20px'

export const SprintContainer = styled.div`
  width: 100%;
  position: relative;
`

export const SprintBlock = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  top: 5px;
  position: sticky;

  border-radius: 8px;
  background-color: ${COLOR.background[500]};

  ::before {
    content: '';
    display: block;
    width: 100%;
    height: 5px;
    position: absolute;
    top: -5px;
    background-color: ${COLOR.background[500]};
  }
`

export const ButtonBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`

export const TaskSumInfo = styled.div<{ isDefault: boolean }>`
  display: flex;
  align-items: center;
  ${({ isDefault }) =>
    isDefault &&
    css`
      margin-right: calc(${ACTION_BUTTON_SIZE} * 2 + ${RIGHT_PART_GAP_PX});
    `}
`

export const TaskBlock = styled.div<{ isExpanded: boolean }>`
  padding-left: 20px;

  margin-top: 12px;

  transition: all 0.3s ease-in-out;
  overflow: hidden;

  ${({ isExpanded }) =>
    !isExpanded &&
    css`
      height: 0;
    `}
`

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  padding-left: 20px;
`

export const Title = styled.h2`
  position: relative;
  ${TEXT_STYLES.headline.h2}
  color: ${COLOR.text.secondary};
`

export const SprintDate = styled.p`
  height: 12px;
  ${TEXT_STYLES.caption}
  color: ${COLOR.text.tertiary};
`

export const ControlsBlock = styled.div`
  display: flex;
  flex-shrink: 0;
  justify-content: start;
  align-items: center;
`

export const ExpandBlock = styled.div`
  position: absolute;
  left: -20px;
  z-index: 1;
  top: 5px;
`

export const TaskAmount = styled.p`
  ${TEXT_STYLES.caption}
  color: ${COLOR.text.tertiary};
`

export const EstimationSum = styled.p`
  width: 59px;
  ${TEXT_STYLES.storyPoint}
  color: ${COLOR.text.secondary};
  text-align: center;
`

export const ExpandButton = styled(ButtonWithoutStyles)<{
  isExpanded: boolean
}>`
  width: 16px;
  height: 16px;

  display: flex;
  align-items: center;
  justify-content: center;

  transform: rotate(0deg);
  ${({ isExpanded }) =>
    !isExpanded &&
    css`
      transform: rotate(180deg);
    `};
  transition: transform 0.3s ease-in-out;
`
