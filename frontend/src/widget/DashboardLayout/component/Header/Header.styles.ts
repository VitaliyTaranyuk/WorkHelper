import styled from '@emotion/styled'
import { LEFT_SIDE_WIDTH_PX } from '../../constants'
import { VerticalLine } from '@/shared/ui/Line'

const HEADER_PADDING_TOP_PX = '35px'
const HEADER_HEIGHT_PX = '85px'

export const StyledVerticalLine = styled(VerticalLine)`
  height: ${HEADER_HEIGHT_PX};
  position: absolute;
  top: 0;
  left: ${LEFT_SIDE_WIDTH_PX};
`

export const TopBlock = styled.header`
  position: relative;
  padding-top: ${HEADER_PADDING_TOP_PX};
  height: ${HEADER_HEIGHT_PX};
  width: 100%;
  display: flex;
  align-items: center;
`

export const HeaderSideBlock = styled.div`
  width: ${LEFT_SIDE_WIDTH_PX};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  min-width: 0;
`
export const HeaderMainBlock = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
  width: 100%;
  padding-left: 20px;
  padding-right: 20px;
  gap: 20px;
`

