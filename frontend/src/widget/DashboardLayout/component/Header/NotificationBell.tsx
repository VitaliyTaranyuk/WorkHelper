import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
  const navigate = useNavigate()

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

        {notifications.map((n) => {
          // Уведомление кликабельно: задача — по taskCode; встреча — внешняя
          // ссылка (Телемост) или запись встречи в календаре (ТП-37).
          const clickable = Boolean(n.taskCode || n.link || n.meetingId)
          return (
            <MenuItem
              key={n.id}
              onClick={() => {
                if (!n.read) markRead.mutate(n.id)
                if (!clickable) return
                setAnchorEl(null)
                if (n.taskCode) {
                  navigate({ to: '/task/$code', params: { code: n.taskCode } })
                } else if (n.link) {
                  window.open(n.link, '_blank', 'noopener,noreferrer')
                } else if (n.meetingId && n.projectId) {
                  navigate({
                    to: '/project/$projectId/calendar',
                    params: { projectId: n.projectId },
                    search: { meetingId: n.meetingId },
                  })
                }
              }}
              sx={{
                whiteSpace: 'normal',
                cursor: clickable ? 'pointer' : 'default',
                backgroundColor: n.read ? 'transparent' : 'rgba(99,102,241,0.08)',
              }}
            >
              <ListItemText
                primary={n.message}
                secondary={
                  n.taskCode
                    ? `${n.taskCode} · ${new Date(n.createdAt).toLocaleString()}`
                    : new Date(n.createdAt).toLocaleString()
                }
                slotProps={{
                  primary: {
                    sx: { color: clickable ? 'primary.main' : 'inherit' },
                  },
                }}
              />
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
