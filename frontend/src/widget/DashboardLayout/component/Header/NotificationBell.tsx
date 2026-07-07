import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useModal } from '@ebay/nice-modal-react'
import { TaskCardModal, CreateTaskModal } from '@/widget/modal/task'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '@/features/notification/useNotifications'
import { NotificationSettingsForm } from '@/features/notification/NotificationSettingsForm'
import {
  getNotificationMeta,
  getNotificationIcon,
  getNotificationIconStyle,
  isTaskDeleted,
} from '@/features/notification/notificationMeta'
import { notify } from '@/shared/ui/notify'
import { formatRelativeTime } from '@/shared/utils/date'
import { parseMeetToken } from '@/features/meet/meetLink'
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
  // ТП-120: настройки уведомлений живут в самой панели — скрыты по умолчанию,
  // раскрываются кнопкой-«тумблером» и сворачиваются обратно при закрытии.
  const [showSettings, setShowSettings] = useState(false)
  const open = Boolean(anchorEl)
  const navigate = useNavigate()
  const bellRef = useRef<HTMLButtonElement>(null)
  // ТП-89: задача из уведомления открывается той же модальной карточкой, что и
  // с доски/списка (единый компонент), а не отдельной страницей.
  const taskCardModal = useModal(TaskCardModal)
  // ТП-193: авто-задача на фикс прод-ошибки из уведомления
  const createTaskModal = useModal(CreateTaskModal)

  const unreadQuery = useUnreadCount()
  // ТП-179: список подгружен фоном заранее — открытие меню мгновенное
  const listQuery = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const unread = unreadQuery.data ?? 0
  // ТП-179: рендерим последние 50 — сотни MenuItem заметно тормозили
  // открытие меню; старое доступно в истории задач, не в колокольчике.
  const allNotifications = listQuery.data ?? []
  const notifications = allNotifications.slice(0, 50)
  const hiddenCount = allNotifications.length - notifications.length

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
    setShowSettings(false)
    setAnchorEl(null)
  }

  // ТП-89: открыть карточку задачи модалкой (как с доски) и после закрытия
  // вернуть пользователя к списку уведомлений без перезагрузки страницы.
  const openTaskCard = async (taskCode: string) => {
    const anchor = bellRef.current
    closeMenu()
    try {
      await taskCardModal.show({ taskCode })
    } catch {
      // модалка закрыта без сохранения — это не ошибка
    }
    if (anchor) setAnchorEl(anchor)
  }

  // Куда ведёт уведомление: задача (по коду), внешняя ссылка (Телемост),
  // запись встречи в календаре. Общая логика для всех типов.
  const openTarget = (n: NotificationDto) => {
    // ТП-193: алерт прод-ошибки — вместо пустой вкладки на GlitchTip (нужен
    // отдельный вход) создаём ЗАДАЧУ НА ФИКС с контекстом ошибки. Ссылка на
    // issue остаётся в описании — для тех, у кого есть доступ к мониторингу.
    if (n.type === 'MONITORING_ALERT') {
      closeMenu()
      const description = [
        `Прод-ошибка из мониторинга: ${n.message}`,
        n.link ? `\nIssue: ${n.link}` : '',
      ]
        .join('')
        .trim()
      void createTaskModal
        .show({
          initialTitle: `Исправить: ${n.message}`.slice(0, 200),
          initialDescription: description,
        })
        .catch(() => undefined)
      return
    }
    // ТП-152: задача удалена — карточку не открываем, компактное сообщение.
    if (isTaskDeleted(n.taskState)) {
      notify.info(`Задача ${n.taskCode ?? ''} была удалена`.trim())
      return
    }
    if (n.taskCode) {
      openTaskCard(n.taskCode)
      return
    }
    if (n.link) {
      // M5 (ТП-165): ссылка на видеовстречу WorkTask открывается внутри
      // приложения (страница /meet), внешние сервисы — новой вкладкой.
      const meetToken = parseMeetToken(n.link)
      if (meetToken) {
        navigate({ to: '/meet/$token', params: { token: meetToken } })
        return
      }
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
        ref={bellRef}
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
          <Typography variant="subtitle2">
            {showSettings ? 'Настройки уведомлений' : 'Уведомления'}
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.5}>
            {!showSettings && unread > 0 && (
              <Button size="small" onClick={() => markAllRead.mutate()}>
                Прочитать все
              </Button>
            )}
            <Tooltip
              title={
                showSettings ? 'Скрыть настройки' : 'Настройки уведомлений'
              }
            >
              <IconButton
                size="small"
                aria-label="Настройки уведомлений"
                aria-pressed={showSettings}
                onClick={() => setShowSettings((s) => !s)}
                color={showSettings ? 'primary' : 'default'}
              >
                <TuneOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Divider />

        {showSettings && <NotificationSettingsForm />}

        {!showSettings && hiddenCount > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', px: 2, py: 0.5 }}
          >
            Показаны последние 50 из {allNotifications.length}
          </Typography>
        )}

        {!showSettings && notifications.length === 0 && (
          <Stack alignItems="center" sx={{ py: 4, px: 2 }}>
            <NotificationsNoneOutlinedIcon
              sx={{ color: 'text.disabled', fontSize: 32, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              Нет уведомлений
            </Typography>
          </Stack>
        )}

        {!showSettings &&
          notifications.map((n) => {
            const meta = getNotificationMeta(n.type)
            const clickable = Boolean(
              n.taskCode ||
                n.link ||
                n.meetingId ||
                n.type === 'MONITORING_ALERT',
            )
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
                  backgroundColor: n.read
                    ? 'transparent'
                    : 'var(--wt-accent-soft)',
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
                    {/* ТП-152: удалённая задача — код зачёркнут, явная пометка;
                        история уведомления сохраняется, понятно, о чём была речь. */}
                    <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                      {meta.title}
                      {n.taskCode ? (
                        <Box
                          component="span"
                          sx={
                            isTaskDeleted(n.taskState)
                              ? {
                                  textDecoration: 'line-through',
                                  color: 'text.disabled',
                                }
                              : undefined
                          }
                        >
                          {` · ${n.taskCode}`}
                        </Box>
                      ) : (
                        ''
                      )}
                      {isTaskDeleted(n.taskState) && (
                        <Box
                          component="span"
                          sx={{ color: 'text.disabled', fontWeight: 400 }}
                        >
                          {' — задача удалена'}
                        </Box>
                      )}
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
                          backgroundColor: 'var(--wt-accent)',
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
