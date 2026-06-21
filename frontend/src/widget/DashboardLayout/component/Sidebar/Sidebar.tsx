import styled from '@emotion/styled'
import {
  BLOCK_BORDER_WIDTH_PX,
  LEFT_SIDE_WIDTH_PX,
  MAIN_BLOCK_PADDING_TOP_PX,
} from '../../constants'
import { ProjectBlock } from './component/ProjectBlock'
import { VerticalLine } from '@/shared/ui/Line'

interface SideBarProps {
  className?: string
}

export function Sidebar({ className }: SideBarProps) {
  return (
    <SidebarContainer className={className}>
      <ProjectBlock />
      <StyledVerticalLine size={BLOCK_BORDER_WIDTH_PX} />
    </SidebarContainer>
  )
}

const StyledVerticalLine = styled(VerticalLine)`
  height: calc(100% + ${MAIN_BLOCK_PADDING_TOP_PX});
  position: absolute;
  top: -${MAIN_BLOCK_PADDING_TOP_PX};
  left: ${LEFT_SIDE_WIDTH_PX};
`

const SidebarContainer = styled.aside`
  position: relative;
  width: ${LEFT_SIDE_WIDTH_PX};

  flex-shrink: 0;
  background-color: rgba(224, 228, 234, 1);

  display: flex;
  flex-direction: column;
`
