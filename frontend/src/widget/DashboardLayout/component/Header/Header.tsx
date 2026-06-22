import { BLOCK_BORDER_WIDTH_PX } from '../../constants'
import { Avatar } from '@/shared/ui/components/Avatar'
import { useAuthStore, userSelector } from '@/features/auth/authStore'
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'
import {
  HeaderMainBlock,
  HeaderSideBlock,
  TopBlock,
  ProjectName,
  StyledVerticalLine,
} from './Header.styles'
import { UserPopupMenu } from './Menu/UserPopupMenu'
import { NotificationBell } from './NotificationBell'
import { Spacer } from '@/shared/ui/Spacer'
import { HeaderActions } from '@/widget/HeaderActions'
import type { HeaderActionsProps } from '@/widget/HeaderActions/HeaderActions'
import { useProjectData } from '@/features/project/query/useProjectData'
type HeaderProps = {
  headerActions: HeaderActionsProps
}

export function Header({ headerActions }: HeaderProps) {
  const { activeProject } = useProjectData()

  return (
    <TopBlock>
      <HeaderSideBlock>
        <WorkTaskLogo />
      </HeaderSideBlock>
      <StyledVerticalLine size={BLOCK_BORDER_WIDTH_PX} />
      <HeaderMainBlock>
        <ProjectName>{activeProject?.name}</ProjectName>
        <Spacer />
        <HeaderActions actions={headerActions} />
        <NotificationBell />
        <UserProfile />
      </HeaderMainBlock>
    </TopBlock>
  )
}

// в будущем перенесем скорее всего отсюда
function WorkTaskLogo() {
  return (
    <div
      style={{
        color: COLOR.text.active,
        ...TEXT_STYLES.headline.h1,
      }}
    >
      WorkTask
    </div>
  )
}

// TODO: при добавлении разлогина перенести в features
function UserProfile() {
  const user = useAuthStore(userSelector)

  return (
    <div style={{ position: 'relative' }}>
      <Avatar size="l" username={user || undefined} />
      <UserPopupMenu />
    </div>
  )
}
