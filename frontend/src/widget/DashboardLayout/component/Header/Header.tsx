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
import { VoiceControl } from '@/features/voice/VoiceControl'
import { Spacer } from '@/shared/ui/Spacer'
import { HeaderActions } from '@/widget/HeaderActions'
import type { HeaderActionsProps } from '@/widget/HeaderActions/HeaderActions'
import { useProjectData } from '@/features/project/query/useProjectData'
import IconButton from '@mui/material/IconButton'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt'
import { useBoardEditModeStore } from '@/features/board/boardEditModeStore'
import { Link } from '@tanstack/react-router'
import { useModal } from '@ebay/nice-modal-react'
import { InviteUsersModal } from '@/widget/modal/project/InviteUsersModal'
type HeaderProps = {
  headerActions: HeaderActionsProps
}

export function Header({ headerActions }: HeaderProps) {
  const { activeProject } = useProjectData()
  const { editMode, isDirty, toggle } = useBoardEditModeStore()
  const inviteModal = useModal(InviteUsersModal)

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
      <HeaderSideBlock>
        <WorkTaskLogo />
      </HeaderSideBlock>
      <StyledVerticalLine size={BLOCK_BORDER_WIDTH_PX} />
      <HeaderMainBlock>
        <ProjectName>{activeProject?.name}</ProjectName>
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
        {/* ТП-35: приглашение пользователей в проект (вручную/по ссылке) */}
        <IconButton
          aria-label="Пригласить в проект"
          title="Пригласить в проект"
          onClick={() => inviteModal.show()}
          size="small"
        >
          <PersonAddAltIcon fontSize="small" />
        </IconButton>
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
