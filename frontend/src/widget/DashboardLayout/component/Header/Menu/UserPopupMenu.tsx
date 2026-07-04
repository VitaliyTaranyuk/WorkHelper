import MenuItem from '@mui/material/MenuItem'
import { useState } from 'react'
import { MenuButton, PopupMenu } from './UserPopupMenu.muiStyles'
import { Divider, ListItemIcon, Stack, Typography } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useModal } from '@ebay/nice-modal-react'
import { useLogout } from './useLogout'
import { useAuthStore, userSelector } from '@/features/auth/authStore'
import { Avatar } from '@/shared/ui/components/Avatar'
import { formatUserName } from '@/entities/user/utils'
import { ProfileSettingsModal } from '@/widget/modal/user/ProfileSettingsModal'

/**
 * Меню пользователя на аватаре (ТП-14, переработано в ТП-63 по паттерну
 * Jira/GitHub/Linear): identity-заголовок (кто вошёл) + только действия
 * пользователя — настройки профиля и выход. Настройки приложения здесь
 * НЕ дублируются (они в «Настройки» левого меню).
 */
export function UserPopupMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = !!anchorEl
  const logout = useLogout()
  const user = useAuthStore(userSelector)
  const profileModal = useModal(ProfileSettingsModal)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <MenuButton
        disableRipple
        onClick={handleClick}
        aria-label="Меню пользователя"
        title="Меню пользователя"
      >
        <KeyboardArrowDownIcon
          fontSize="small"
          sx={{
            position: 'absolute',
            right: -6,
            bottom: -2,
            fontSize: 16,
            color: 'text.secondary',
            backgroundColor: '#fff',
            borderRadius: '50%',
            boxShadow: '0 0 2px rgba(0,0,0,0.25)',
          }}
        />
      </MenuButton>
      <PopupMenu open={open} onClose={handleClose} anchorEl={anchorEl}>
        {/* Identity-заголовок: кто вошёл (паттерн GitHub/Jira) */}
        <Stack
          direction="row"
          alignItems="center"
          gap={1.5}
          sx={{ px: 2, py: 1, minWidth: 240 }}
        >
          <Avatar size="l" username={user || undefined} />
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {formatUserName(user)}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email}
              {user?.username ? ` · @${user.username}` : ''}
            </Typography>
          </Stack>
        </Stack>
        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          disabled={!user}
          onClick={() => {
            handleClose()
            if (user) profileModal.show({ user })
          }}
        >
          <ListItemIcon>
            <ManageAccountsOutlinedIcon />
          </ListItemIcon>
          Настройки профиля
        </MenuItem>
        <MenuItem
          className="logout"
          onClick={() => {
            handleClose()
            logout()
          }}
        >
          <ListItemIcon>
            <LogoutOutlinedIcon color="error" />
          </ListItemIcon>
          Выйти из системы
        </MenuItem>
      </PopupMenu>
    </>
  )
}
