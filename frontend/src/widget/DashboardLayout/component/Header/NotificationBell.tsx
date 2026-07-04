import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import Badge from '@mui/material/Badge'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '@/features/notification/useNotifications'
import {
  getNotificationMeta,
  getNotificationIcon,
  getNotificationIconStyle,
} from '@/features/notification/notificationMeta'
import { formatRelativeTime } from '@/shared/utils/date'
import type { NotificationDto } from '@/shared/api/endpoint/notificationsApi'

/**
 * Колокольчик уведомлений (переработан в ТП-59 по паттернам Jira/GitHub):
 * каждый элемент — иконка типа + заголовок + текст события + относительное
 * время; непрочитанные помечены точкой и фоном; клик помечает прочитанным
 * и ведёт к связанному объекту (задача / внешняя ссылка / встреча).
 * Типы событий описаны в реестре notificationMeta — расширение без правки
 * этого компонента.
 */
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

  // ТП-72: наведение мышью помечает уведомление прочитанным (паттерн
  // GitHub/Linear — не требуется переходить в объект). Set уже отправленных
  // id страхует от повторных запросов, пока список не перезапросился после
  // инвалидции; сбрасывается при закрытии меню.
  const markedRef = useRef<Set<string>>(new Set())
  const markReadOnce = (n: NotificationDto) => {
    if (n.read || markedRef.current.has(n.id)) return
    markedRef.current.add(n.id)
    markRead.mutate(n.id)
  }
  const closeMenu = () => {
    markedRef.current.clear()
    setAnchorEl(null)
  }

  // Куда ведёт уведомление: задача (по коду), внешняя ссылка (Телемост),
  // запись встречи в календаре. Общая логика для всех типов.
  const openTarget = (n: NotificationDto) => {
    if (n.taskCode) {
      navigate({ to: '/task/$code', params: { code: n.taskCode } })
      return
    }
    if (n.link) {
      window.open(n.link, '_blank', 'noopener,noreferrer')
      return
    }
    if (n.meetingId && n.projectId) {
      navigate({
        to: '/project/$projectId/calendar',
        params: { projectId: n.projectId },
        search: { meetingId: n.meetingId },
      })
    }
  }

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
        onClose={closeMenu}
        slotProps={{ paper: { sx: { width: 400, maxHeight: 480 } } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1 }}
        >
          <Typography variant="subtitle2">Уведомления</Typography>
          {unread > 0 && (
            <Button size="small" onClick={() => markAllRead.mutate()}>
              Прочитать все
            </Button>
          )}
        </Stack>
        <Divider />

        {notifications.length === 0 && (
          <Stack alignItems="center" sx={{ py: 4, px: 2 }}>
            <NotificationsNoneOutlinedIcon
              sx={{ color: 'text.disabled', fontSize: 32, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              Нет уведомлений
            </Typography>
          </Stack>
        )}

        {notifications.map((n) => {
          const meta = getNotificationMeta(n.type)
          const clickable = Boolean(n.taskCode || n.link || n.meetingId)
          return (
            <MenuItem
              key={n.id}
              onMouseEnter={() => markReadOnce(n)}
              onClick={() => {
                markReadOnce(n)
                if (!clickable) return
                closeMenu()
                openTarget(n)
              }}
              sx={{
                alignItems: 'flex-start',
                whiteSpace: 'normal',
                gap: 1.25,
                py: 1,
                cursor: clickable ? 'pointer' : 'default',
                backgroundColor: n.read ? 'transparent' : 'rgba(99,102,241,0.06)',
              }}
            >
              {/* Иконка типа события. ТП-87: кружок окрашен по состоянию
                  задачи — завершённые зелёным, отменённые серым. */}
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  flexShrink: 0,
                  mt: 0.25,
                  ...getNotificationIconStyle(n.type, n.taskState),
                }}
              >
                {getNotificationIcon(n.type, n.taskState)}
              </Stack>

              <Stack sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                    {meta.title}
                    {n.taskCode ? ` · ${n.taskCode}` : ''}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0 }}
                  >
                    {formatRelativeTime(n.createdAt)}
                  </Typography>
                  {/* Точка непрочитанного (паттерн GitHub/Linear) */}
                  {!n.read && (
                    <span
                      aria-label="Непрочитано"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0,
                        backgroundColor: '#6366f1',
                      }}
                    />
                  )}
                </Stack>
                <Typography
                  variant="body2"
                  color={n.read ? 'text.secondary' : 'text.primary'}
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {n.message}
                </Typography>
              </Stack>
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
