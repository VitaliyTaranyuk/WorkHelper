import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { COLOR } from './theme/constants'

const DEFAULT_SIZE = '2px'
const DEFAULT_COLOR = COLOR.background[200]

type LineType = 'vertical' | 'horizontal'

type LineProps = {
  className?: string
  size?: string
  color?: string
}

export const VerticalLine = function ({
  className,
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
}: LineProps) {
  return (
    <Line className={className} type="vertical" color={color} size={size} />
  )
}

export const HorizontalLine = function ({
  className,
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
}: LineProps) {
  return (
    <Line className={className} type="horizontal" color={color} size={size} />
  )
}

export const getLineStyles = ({
  size,
  color,
  type,
}: {
  size: string
  color: string
  type: LineType
}) => {
  if (type === 'horizontal')
    return css`
      height: ${size};
      width: 100%;
      background-color: ${color};
    `

  if (type === 'vertical')
    return css`
      width: ${size};
      height: 100%;
      background-color: ${color};
    `

  throw new Error('unexpected behavior')
}

const Line = styled.div<{ size: string; color: string; type: LineType }>`
  ${(props) => getLineStyles(props)}

  background-color: ${({ color }) => color};
  flex-shrink: 0;
`
