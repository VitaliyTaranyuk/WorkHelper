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
import IconButton from '@mui/material/IconButton'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useBoardEditModeStore } from '@/features/board/boardEditModeStore'
import { Link } from '@tanstack/react-router'
type HeaderProps = {
  headerActions: HeaderActionsProps
}

export function Header({ headerActions }: HeaderProps) {
  const { editMode, isDirty, toggle } = useBoardEditModeStore()

  const safeToggle = () => {
    if (editMode && isDirty) {
      if (
        !window.confirm(
          'Несохранённые изменения конфигурации колонок будут потеряны. Выйти из режима редактирования?',
        )
      ) {
        return
      }
    }
    toggle()
  }

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
        <IconButton
          aria-label="Редактирование доски"
          onClick={safeToggle}
          color={editMode ? 'primary' : 'default'}
          title={
            editMode
              ? 'Режим редактирования доски включён'
              : 'Включить редактирование доски'
          }
          size="small"
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <Spacer />
        <HeaderActions actions={headerActions} />
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
