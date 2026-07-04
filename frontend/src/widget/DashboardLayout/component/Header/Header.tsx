import { BLOCK_BORDER_WIDTH_PX } from '../../constants'
import { Avatar } from '@/shared/ui/components/Avatar'
import { useAuthStore, userSelector } from '@/features/auth/authStore'
import {
  HeaderMainBlock,
  HeaderSideBlock,
  TopBlock,
  StyledVerticalLine,
} from './Header.styles'
import { UserPopupMenu } from './Menu/UserPopupMenu'
import { NotificationBell } from './NotificationBell'
import { ProjectSwitcher } from './ProjectSwitcher'
import { Spacer } from '@/shared/ui/Spacer'
import { HeaderActions } from '@/widget/HeaderActions'
import type { HeaderActionsProps } from '@/widget/HeaderActions/HeaderActions'
type HeaderProps = {
  headerActions: HeaderActionsProps
}

export function Header({ headerActions }: HeaderProps) {
  return (
    <TopBlock>
      {/* ТП-54: проект — главный объект рабочего пространства; название
          текущего проекта с меню действий заменяет статичный «WorkTask».
          Дублирующий заголовок проекта из основной части шапки удалён. */}
      <HeaderSideBlock>
        <ProjectSwitcher />
      </HeaderSideBlock>
      <StyledVerticalLine size={BLOCK_BORDER_WIDTH_PX} />
      <HeaderMainBlock>
        {/* ТП-60: кнопка редактирования доски переехала на саму доску
            («Настроить доску» в Board) — в шапке она относилась только
            к одному разделу и терялась среди глобальных действий. */}
        <Spacer />
        <HeaderActions actions={headerActions} />
        {/* ТП-88: глобальный командный микрофон убран — голос теперь способ
            ВВОДА в контексте (диктовка в полях/создании задачи), а не команды. */}
        <NotificationBell />
        {/* ТП-56: шестерёнка убрана — настройки открываются из левого меню,
            дубль точки входа вводил в заблуждение (аудит ТП-63, п.3) */}
        <UserProfile />
      </HeaderMainBlock>
    </TopBlock>
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
