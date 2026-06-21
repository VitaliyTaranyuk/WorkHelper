import { useState } from 'react'
import Badge from '@mui/material/Badge'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '@/features/notification/useNotifications'

export function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const unreadQuery = useUnreadCount()
  const listQuery = useNotifications(open)
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const unread = unreadQuery.data ?? 0
  const notifications = listQuery.data ?? []

  return (
    <>
      <IconButton
        aria-label="Уведомления"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="large"
      >
        <Badge badgeContent={unread} color="error" overlap="circular">
          <NotificationsNoneOutlinedIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 440 } } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
          }}
        >
          <strong>Уведомления</strong>
          {unread > 0 && (
            <Button size="small" onClick={() => markAllRead.mutate()}>
              Прочитать все
            </Button>
          )}
        </div>
        <Divider />

        {notifications.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="Нет уведомлений" />
          </MenuItem>
        )}

        {notifications.map((n) => (
          <MenuItem
            key={n.id}
            onClick={() => !n.read && markRead.mutate(n.id)}
            sx={{
              whiteSpace: 'normal',
              backgroundColor: n.read ? 'transparent' : 'rgba(99,102,241,0.08)',
            }}
          >
            <ListItemText
              primary={n.message}
              secondary={new Date(n.createdAt).toLocaleString()}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
