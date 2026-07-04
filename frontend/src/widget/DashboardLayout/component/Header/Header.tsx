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
import { VoiceControl } from '@/features/voice/VoiceControl'
import { Spacer } from '@/shared/ui/Spacer'
import { HeaderActions } from '@/widget/HeaderActions'
import type { HeaderActionsProps } from '@/widget/HeaderActions/HeaderActions'
import IconButton from '@mui/material/IconButton'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { Link } from '@tanstack/react-router'
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
        {/* ТП-22: голосовое управление (кнопка + настраиваемый хоткей) */}
        <VoiceControl />
        <NotificationBell />
        <IconButton
          component={Link}
          to="/settings"
          aria-label="Настройки"
          title="Настройки"
          size="small"
        >
          <SettingsOutlinedIcon fontSize="small" />
        </IconButton>
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
