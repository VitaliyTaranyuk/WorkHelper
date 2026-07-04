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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useBoardEditModeStore } from '@/features/board/boardEditModeStore'
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
        {/* ТП-22: голосовое управление (кнопка + настраиваемый хоткей) */}
        <VoiceControl />
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
