import { Badge, IconButton, Stack, Tooltip } from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import VideocamOffOutlinedIcon from '@mui/icons-material/HideImageOutlined'
import ScreenShareOutlinedIcon from '@mui/icons-material/ScreenShareOutlined'
import StopScreenShareOutlinedIcon from '@mui/icons-material/StopScreenShareOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CallEndIcon from '@mui/icons-material/CallEnd'
import { DeviceMenu } from './DeviceMenu'
import { stage } from './stage'

type Props = {
  muted: boolean
  cameraOn: boolean
  audioMode: boolean
  screenSharing: boolean
  chatOpen: boolean
  chatUnread: number
  participantsOpen: boolean
  participantsCount: number
  onToggleMute: () => void
  onToggleCamera: () => void
  onToggleAudioMode: () => void
  onToggleScreenShare: () => void
  onToggleChat: () => void
  onToggleParticipants: () => void
  onSelectMicrophone: (deviceId: string) => void
  onSelectCamera: (deviceId: string) => void
  onLeave: () => void
}

const controlSx = (active: boolean, danger?: boolean) => ({
  width: 48,
  height: 48,
  color: stage.text,
  backgroundColor: danger
    ? stage.controlActiveOff
    : active
      ? stage.controlActiveOff
      : stage.controlBg,
  '&:hover': {
    backgroundColor: danger
      ? '#d33b2f'
      : active
        ? '#d33b2f'
        : stage.controlHover,
  },
})

/**
 * Панель управления звонком (канон нижней панели Meet/Zoom): управляется с
 * клавиатуры, каждая кнопка — с aria-label и подсказкой. «Выключенное»
 * состояние микрофона/камеры — красное (универсальный код видеосервисов).
 */
export function MeetControls({
  muted,
  cameraOn,
  audioMode,
  screenSharing,
  chatOpen,
  chatUnread,
  participantsOpen,
  participantsCount,
  onToggleMute,
  onToggleCamera,
  onToggleAudioMode,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onSelectMicrophone,
  onSelectCamera,
  onLeave,
}: Props) {
  return (
    <Stack
      direction="row"
      gap={1.5}
      alignItems="center"
      justifyContent="center"
      sx={{ py: 1.5, px: 2, flexWrap: 'wrap' }}
    >
      <Tooltip title={muted ? 'Включить микрофон' : 'Выключить микрофон'}>
        <IconButton
          aria-label={muted ? 'Включить микрофон' : 'Выключить микрофон'}
          aria-pressed={muted}
          onClick={onToggleMute}
          sx={controlSx(muted)}
        >
          {muted ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title={cameraOn ? 'Выключить камеру' : 'Включить камеру'}>
        <IconButton
          aria-label={cameraOn ? 'Выключить камеру' : 'Включить камеру'}
          aria-pressed={!cameraOn}
          onClick={onToggleCamera}
          sx={controlSx(!cameraOn)}
        >
          {cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip
        title={
          audioMode
            ? 'Показывать видео участников'
            : 'Аудио-режим: не принимать видео (слабая сеть)'
        }
      >
        <IconButton
          aria-label={
            audioMode ? 'Показывать видео участников' : 'Включить аудио-режим'
          }
          aria-pressed={audioMode}
          onClick={onToggleAudioMode}
          sx={controlSx(audioMode)}
        >
          <VideocamOffOutlinedIcon />
        </IconButton>
      </Tooltip>

      <Tooltip
        title={
          screenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'
        }
      >
        <IconButton
          aria-label={
            screenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'
          }
          aria-pressed={screenSharing}
          onClick={onToggleScreenShare}
          sx={controlSx(screenSharing)}
        >
          {screenSharing ? (
            <StopScreenShareOutlinedIcon />
          ) : (
            <ScreenShareOutlinedIcon />
          )}
        </IconButton>
      </Tooltip>

      <Tooltip title="Чат встречи">
        <IconButton
          aria-label={
            chatUnread > 0 ? `Чат (${chatUnread} непрочитанных)` : 'Чат встречи'
          }
          aria-pressed={chatOpen}
          onClick={onToggleChat}
          sx={controlSx(false)}
        >
          <Badge badgeContent={chatUnread} color="error" max={99}>
            <ChatBubbleOutlineIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Tooltip title="Участники">
        <IconButton
          aria-label={`Участники (${participantsCount})`}
          aria-pressed={participantsOpen}
          onClick={onToggleParticipants}
          sx={controlSx(false)}
        >
          <PeopleOutlineIcon />
        </IconButton>
      </Tooltip>

      <DeviceMenu
        onSelectMicrophone={onSelectMicrophone}
        onSelectCamera={onSelectCamera}
      />

      <Tooltip title="Покинуть встречу">
        <IconButton
          aria-label="Покинуть встречу"
          onClick={onLeave}
          sx={{ ...controlSx(false, true), width: 64 }}
        >
          <CallEndIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
