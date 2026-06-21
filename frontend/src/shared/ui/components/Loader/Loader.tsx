import { CircularProgress } from '@mui/material'
import { Wrapper, LoaderContainer } from './Loader.styles'
import { memo, type FC, type ReactNode } from 'react'

const DEFAULT_SIZE = 40
const DEFAULT_COLOR = '#7761E6'

type LoaderProps = {
  isLoading?: boolean
  size?: number
  children?: ReactNode
  color?: string
  className?: string
}

export const Loader: FC<LoaderProps> = memo((props) => {
  if (props.isLoading) {
    return (
      <Wrapper className={props.className}>
        <LoaderContainer>
          <CircularProgress
            size={props.size || DEFAULT_SIZE}
            sx={{ color: props.color || DEFAULT_COLOR }}
          />
        </LoaderContainer>
      </Wrapper>
    )
  }

  return props.children
})
