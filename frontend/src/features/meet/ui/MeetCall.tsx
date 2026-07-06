import { useMemo, useState } from 'react'
import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import type { MeetRoomDto } from '@/shared/api/endpoint/meetApi'
import type { useMeetSession } from '../useMeetSession'
import { useSpeakingDetection } from '../useSpeakingDetection'
import { VideoTile } from './VideoTile'
import { MeetControls } from './MeetControls'
import { ParticipantsPanel } from './ParticipantsPanel'
import { stage } from './stage'

type Props = {
  room: MeetRoomDto
  selfName: string
  localStream: MediaStream | null
  session: ReturnType<typeof useMeetSession>
  onLeave: () => void
}

/**
 * Экран активного звонка: сетка плиток (auto-fit, 1–8 участников), верхняя
 * полоса с названием и статусом соединения, нижняя панель контролов, панель
 * участников. Сцена тёмная в обеих темах (канон видеосервисов, ui/stage.ts).
 */
export function MeetCall({ room, selfName, localStream, session, onLeave }: Props) {
  const {
    state,
    signalStatus,
    remoteStreams,
    connectionStates,
    muted,
    cameraOn,
    audioMode,
    selfIsHost,
    toggleMute,
    toggleCamera,
    setAudioMode,
  } = session
  const [participantsOpen, setParticipantsOpen] = useState(false)

  const speaking = useSpeakingDetection(remoteStreams, localStream, muted)

  const tiles = useMemo(
    () => [
      {
        key: 'self',
        name: selfName,
        stream: localStream,
        isSelf: true,
        muted,
        cameraOn,
        speaking: speaking.has('self'),
        connecting: false,
      },
      ...state.peers.map((peer) => ({
        key: peer.sessionId,
        name: peer.name,
        stream: remoteStreams.get(peer.sessionId) ?? null,
        isSelf: false,
        muted: peer.muted,
        cameraOn: peer.cameraOn && !audioMode,
        speaking: speaking.has(peer.sessionId),
        connecting: !['connected', 'closed'].includes(
          connectionStates.get(peer.sessionId) ?? 'new',
        ),
      })),
    ],
    [
      selfName,
      localStream,
      muted,
      cameraOn,
      audioMode,
      state.peers,
      remoteStreams,
      connectionStates,
      speaking,
    ],
  )

  // 1-2 плитки — крупнее; больше — плотная сетка (как Meet)
  const minTile = tiles.length <= 2 ? 320 : tiles.length <= 4 ? 280 : 220

  return (
    <Stack sx={{ height: '100dvh', backgroundColor: stage.bg }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        sx={{ px: 2, py: 1 }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ color: stage.text, fontWeight: 600 }}>
            {state.roomTitle ?? room.title}
          </Typography>
          {room.taskCode && (
            <Chip
              size="small"
              label={room.taskCode}
              sx={{ backgroundColor: stage.controlBg, color: stage.text }}
            />
          )}
        </Stack>
        <Chip
          size="small"
          label={`${state.peers.length + 1} / ${state.maxParticipants}`}
          sx={{ backgroundColor: stage.controlBg, color: stage.text }}
        />
      </Stack>

      {signalStatus === 'reconnecting' && (
        <Alert
          severity="warning"
          icon={<WifiOffIcon fontSize="small" />}
          sx={{ mx: 2, mb: 1, py: 0 }}
        >
          Соединение прервано — переподключаемся…
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: `repeat(auto-fit, minmax(min(${minTile}px, 100%), 1fr))`,
          },
          alignContent: 'center',
          gap: 1.5,
          px: 2,
          pb: 1,
          // На широком экране с 1-2 плитками не растягиваем на всю ширину
          ...(tiles.length <= 2 && {
            maxWidth: 1100,
            width: '100%',
            mx: 'auto',
          }),
        }}
      >
        {tiles.map((tile) => (
          <VideoTile
            key={tile.key}
            stream={tile.stream}
            name={tile.name}
            isSelf={tile.isSelf}
            muted={tile.muted}
            cameraOn={tile.cameraOn}
            speaking={tile.speaking}
            connecting={tile.connecting}
          />
        ))}
      </Box>

      <MeetControls
        muted={muted}
        cameraOn={cameraOn}
        audioMode={audioMode}
        participantsOpen={participantsOpen}
        participantsCount={state.peers.length + 1}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleAudioMode={() => setAudioMode(!audioMode)}
        onToggleParticipants={() => setParticipantsOpen((prev) => !prev)}
        onLeave={onLeave}
      />

      <ParticipantsPanel
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        selfName={selfName}
        selfMuted={muted}
        selfCameraOn={cameraOn}
        selfIsHost={selfIsHost}
        hostUserId={state.hostUserId}
        peers={state.peers}
      />
    </Stack>
  )
}
