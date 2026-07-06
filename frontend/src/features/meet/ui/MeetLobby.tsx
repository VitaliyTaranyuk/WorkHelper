import { useEffect, useRef } from 'react'
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import ReplayIcon from '@mui/icons-material/Replay'
import type { MeetRoomDto } from '@/shared/api/endpoint/meetApi'
import { accessMessage } from '../core/devices'
import type { MediaAccess } from '../core/types'
import type { MediaDeviceOption } from '../core/devices'
import { stage } from './stage'

type Props = {
  room: MeetRoomDto
  stream: MediaStream | null
  access: MediaAccess
  microphones: MediaDeviceOption[]
  cameras: MediaDeviceOption[]
  audioDeviceId: string
  videoDeviceId: string
  onSelectMicrophone: (deviceId: string) => void
  onSelectCamera: (deviceId: string) => void
  onRetry: () => void
  onJoin: () => void
}

/**
 * Лобби встречи (канон Meet/Zoom): превью камеры и выбор устройств ДО входа —
 * медиа не уходит другим, пока пользователь не нажал «Присоединиться».
 * Без устройств вход разрешён (recvonly): понятное состояние вместо блокера.
 */
export function MeetLobby({
  room,
  stream,
  access,
  microphones,
  cameras,
  audioDeviceId,
  videoDeviceId,
  onSelectMicrophone,
  onSelectCamera,
  onRetry,
  onJoin,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  const message = accessMessage(access)
  const hasVideo = !!stream && stream.getVideoTracks().length > 0
  const joinDisabled = access === 'pending' || access === 'unsupported'

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      gap={3}
      sx={{ minHeight: '100dvh', p: 2, backgroundColor: 'var(--wt-bg)' }}
    >
      <Stack alignItems="center" gap={0.5}>
        <Typography variant="h5" fontWeight={600} textAlign="center">
          {room.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {room.projectName ? `Проект «${room.projectName}»` : 'Видеовстреча WorkTask'}
          {room.createdByName ? ` · организатор ${room.createdByName}` : ''}
        </Typography>
      </Stack>

      <Box
        sx={{
          width: 'min(560px, 100%)',
          aspectRatio: '16 / 9',
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: stage.tile,
          position: 'relative',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: hasVideo ? 'block' : 'none',
          }}
        />
        {!hasVideo && (
          <Stack
            alignItems="center"
            justifyContent="center"
            gap={1}
            sx={{ position: 'absolute', inset: 0 }}
          >
            <VideocamOutlinedIcon sx={{ fontSize: 44, color: stage.textMuted }} />
            <Typography variant="body2" sx={{ color: stage.textMuted }}>
              {access === 'pending' ? 'Запрашиваем доступ…' : 'Камера выключена'}
            </Typography>
          </Stack>
        )}
      </Box>

      {message && (
        <Alert
          severity={access === 'unsupported' || access === 'denied' ? 'warning' : 'info'}
          sx={{ width: 'min(560px, 100%)' }}
          action={
            access === 'denied' ? (
              <Button
                size="small"
                color="inherit"
                startIcon={<ReplayIcon />}
                onClick={onRetry}
              >
                Повторить
              </Button>
            ) : undefined
          }
        >
          {message}
        </Alert>
      )}

      {(microphones.length > 0 || cameras.length > 0) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={1.5}
          sx={{ width: 'min(560px, 100%)' }}
        >
          {microphones.length > 0 && (
            <TextField
              select
              fullWidth
              size="small"
              label="Микрофон"
              value={audioDeviceId || microphones[0]?.deviceId || ''}
              onChange={(e) => onSelectMicrophone(e.target.value)}
            >
              {microphones.map((device) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {cameras.length > 0 && (
            <TextField
              select
              fullWidth
              size="small"
              label="Камера"
              value={videoDeviceId || cameras[0]?.deviceId || ''}
              onChange={(e) => onSelectCamera(e.target.value)}
            >
              {cameras.map((device) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      )}

      <Button
        variant="contained"
        size="large"
        disabled={joinDisabled}
        onClick={onJoin}
        sx={{ minWidth: 220 }}
      >
        {access === 'no-devices' || access === 'denied'
          ? 'Войти без устройств'
          : 'Присоединиться'}
      </Button>
    </Stack>
  )
}
