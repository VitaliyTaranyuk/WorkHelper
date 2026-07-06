import {
  Avatar,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
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
}: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const row = (params: {
    key: string
    name: string
    suffix?: string
    muted: boolean
    cameraOn: boolean
    isHost: boolean
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
        {params.muted ? (
          <MicOffIcon fontSize="small" sx={{ color: 'error.main' }} />
        ) : (
          <MicIcon fontSize="small" sx={{ color: 'success.main' }} />
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
          }),
        )}
      </List>
    </Drawer>
  )
}
