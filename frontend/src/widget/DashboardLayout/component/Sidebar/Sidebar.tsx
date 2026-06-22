import styled from '@emotion/styled'
import {
  BLOCK_BORDER_WIDTH_PX,
  LEFT_SIDE_WIDTH_PX,
  MAIN_BLOCK_PADDING_TOP_PX,
} from '../../constants'
import { ProjectBlock } from './component/ProjectBlock'
import { VerticalLine } from '@/shared/ui/Line'
import { Link } from '@tanstack/react-router'
import { useProjectData } from '@/features/project/query/useProjectData'
import { TEXT_STYLES } from '@/shared/ui/theme/constants'

interface SideBarProps {
  className?: string
}

export function Sidebar({ className }: SideBarProps) {
  const { activeProject } = useProjectData()

  return (
    <SidebarContainer className={className}>
      <ProjectBlock />

      <BottomMenu>
        {activeProject && (
          <MenuLink to={`/project/${activeProject.id}/sprint`}>
            Бэклог
          </MenuLink>
        )}
      </BottomMenu>

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

const BottomMenu = styled.nav`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 32px;
`

const MenuLink = styled(Link)`
  ${TEXT_STYLES.headline.h5};
  color: rgba(120, 116, 134, 1);

  &:hover {
    opacity: 0.8;
  }
`

const SidebarContainer = styled.aside`
  position: relative;
  width: ${LEFT_SIDE_WIDTH_PX};

  flex-shrink: 0;
  background-color: rgba(224, 228, 234, 1);

  display: flex;
  flex-direction: column;
`
