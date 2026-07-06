import {
  Avatar,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined'
import { confirmDialog } from '@/shared/ui/components/ConfirmDialog'
import type { MeetPeer } from '../core/types'

type Props = {
  open: boolean
  onClose: () => void
  selfName: string
  selfMuted: boolean
  selfCameraOn: boolean
  selfIsHost: boolean
  hostUserId: string | null
  peers: MeetPeer[]
  /** Host-контролы (M4): попросить выключить микрофон / удалить из встречи. */
  onHostMute: (sessionId: string) => void
  onHostRemove: (sessionId: string) => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/**
 * Панель участников: семантический список (скринридер читает состав и
 * состояния микрофонов). На мобильном — нижний Drawer, на десктопе — боковой.
 */
export function ParticipantsPanel({
  open,
  onClose,
  selfName,
  selfMuted,
  selfCameraOn,
  selfIsHost,
  hostUserId,
  peers,
  onHostMute,
  onHostRemove,
}: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const removePeer = async (peer: MeetPeer) => {
    // Удаление необратимо в рамках сессии встречи (бан) — подтверждение
    const ok = await confirmDialog({
      title: 'Удалить участника?',
      message: `${peer.name} будет отключён(а) и не сможет вернуться в эту встречу, пока она не соберётся заново.`,
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (ok) onHostRemove(peer.sessionId)
  }

  const row = (params: {
    key: string
    name: string
    suffix?: string
    muted: boolean
    cameraOn: boolean
    isHost: boolean
    peer?: MeetPeer
  }) => (
    <ListItem key={params.key} disableGutters sx={{ px: 2 }}>
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'var(--wt-accent)', color: '#fff' }}>
          {initials(params.name)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={`${params.name}${params.suffix ?? ''}`}
        secondary={params.isHost ? 'Организатор' : undefined}
        primaryTypographyProps={{ noWrap: true }}
      />
      <Stack direction="row" gap={0.5} alignItems="center">
        {!params.cameraOn && (
          <VideocamOffIcon fontSize="small" sx={{ color: 'text.disabled' }} />
        )}
        {/* Host просит замолчать кликом по «живому» микрофону участника */}
        {params.peer && selfIsHost && !params.muted ? (
          <Tooltip title="Попросить выключить микрофон">
            <IconButton
              size="small"
              aria-label={`Попросить ${params.name} выключить микрофон`}
              onClick={() => onHostMute(params.peer!.sessionId)}
            >
              <MicIcon fontSize="small" sx={{ color: 'success.main' }} />
            </IconButton>
          </Tooltip>
        ) : params.muted ? (
          <MicOffIcon fontSize="small" sx={{ color: 'error.main' }} />
        ) : (
          <MicIcon fontSize="small" sx={{ color: 'success.main' }} />
        )}
        {params.peer && selfIsHost && (
          <Tooltip title="Удалить из встречи">
            <IconButton
              size="small"
              aria-label={`Удалить ${params.name} из встречи`}
              onClick={() => void removePeer(params.peer!)}
            >
              <PersonRemoveOutlinedIcon fontSize="small" sx={{ color: 'error.main' }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </ListItem>
  )

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 320,
          maxHeight: isMobile ? '60dvh' : undefined,
          backgroundColor: 'var(--wt-surface)',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5 }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Участники ({peers.length + 1})
        </Typography>
        <IconButton size="small" aria-label="Закрыть панель участников" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <List aria-label="Список участников встречи" sx={{ pt: 0 }}>
        {row({
          key: 'self',
          name: selfName,
          suffix: ' (вы)',
          muted: selfMuted,
          cameraOn: selfCameraOn,
          isHost: selfIsHost,
        })}
        {peers.map((peer) =>
          row({
            key: peer.sessionId,
            name: peer.name,
            muted: peer.muted,
            cameraOn: peer.cameraOn,
            isHost: hostUserId !== null && peer.userId === hostUserId,
            peer,
          }),
        )}
      </List>
    </Drawer>
  )
}
