import styled from '@emotion/styled'
import type { ITaskCard } from '../types'
import { PRIORITY_COLORS, PRIORITY_COLORS_BORDERS } from '../constants'
import { COLOR } from '@/shared/ui/theme/constants'
import { css } from '@emotion/react'

export const TaskCode = styled.span<{
  priority: ITaskCard['priority']
}>`
  flex-shrink: 0;

  font-size: 12px;
  color: ${COLOR.text.secondary};
  font-weight: 400;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46x;
  height: 17px;
  padding: 2px 4px;
  border-radius: 6px;
  border: 1px solid ${({ priority }) => PRIORITY_COLORS_BORDERS[priority]};
  box-sizing: border-box;

  text-align: center;
  line-height: 13px;
  letter-spacing: 1%;

  background-color: ${({ priority }) => PRIORITY_COLORS[priority]};
`

export const TaskTypeWrapper = styled.span<{ size?: string }>`
  display: inline-block;
  flex-shrink: 0;

  ${({ size = '20px' }) => css`
    width: ${size};
    height: ${size};
  `}
`
