import MenuItem from '@mui/material/MenuItem'
import { useState } from 'react'
import { MenuButton, PopupMenu } from './UserPopupMenu.muiStyles'
import { ListItemIcon } from '@mui/material'
import PortraitOutlinedIcon from '@mui/icons-material/PortraitOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useLogout } from './useLogout'

export function UserPopupMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = !!anchorEl

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <MenuButton disableRipple onClick={handleClick}></MenuButton>
      <PopupMenu open={open} onClose={handleClose} anchorEl={anchorEl}>
        <MenuItem disabled onClick={handleClose}>
          <ListItemIcon>
            <PortraitOutlinedIcon />
          </ListItemIcon>
          Профиль
        </MenuItem>
        <MenuItem disabled onClick={handleClose}>
          <ListItemIcon>
            <SettingsOutlinedIcon />
          </ListItemIcon>
          Настройки
        </MenuItem>
        <MenuItem className="logout" onClick={useLogout()}>
          <ListItemIcon>
            <LogoutOutlinedIcon color="error" />
          </ListItemIcon>
          Выход
        </MenuItem>
      </PopupMenu>
    </>
  )
}
