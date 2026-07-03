import MenuItem from '@mui/material/MenuItem'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MenuButton, PopupMenu } from './UserPopupMenu.muiStyles'
import { ListItemIcon } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useLogout } from './useLogout'

/**
 * Меню пользователя на аватаре в шапке (ТП-14).
 * Кнопка имеет видимый индикатор (стрелка) — раньше это была невидимая
 * область поверх аватара, и пункт «Выход» было невозможно обнаружить.
 * Мёртвые disabled-пункты («Профиль») удалены; «Настройки» ведут на /settings.
 */
export function UserPopupMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = !!anchorEl
  const navigate = useNavigate()
  const logout = useLogout()

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
        <MenuItem
          onClick={() => {
            handleClose()
            navigate({ to: '/settings' })
          }}
        >
          <ListItemIcon>
            <SettingsOutlinedIcon />
          </ListItemIcon>
          Настройки
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
