import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import type { MeetRoomDto } from '@/shared/api/endpoint/meetApi'
import type { useMeetSession } from '../useMeetSession'
import { useSpeakingDetection } from '../useSpeakingDetection'
import { VideoTile } from './VideoTile'
import { MeetControls } from './MeetControls'
import { ParticipantsPanel } from './ParticipantsPanel'
import { ChatPanel } from './ChatPanel'
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
    screenSharing,
    selfViewStream,
    selfIsHost,
    toggleMute,
    toggleCamera,
    setAudioMode,
    startScreenShare,
    stopScreenShare,
    switchMicrophone,
    switchCamera,
    sendChat,
    hostMute,
    hostRemove,
  } = session
  const [participantsOpen, setParticipantsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  // Непрочитанные: сколько сообщений пришло при закрытой панели чата
  const seenChatRef = useRef(0)
  useEffect(() => {
    if (chatOpen) seenChatRef.current = state.chat.length
  }, [chatOpen, state.chat.length])
  const chatUnread = chatOpen ? 0 : state.chat.length - seenChatRef.current

  const speaking = useSpeakingDetection(remoteStreams, localStream, muted)

  const tiles = useMemo(
    () => [
      {
        key: 'self',
        name: selfName,
        stream: selfViewStream,
        isSelf: true,
        muted,
        cameraOn: cameraOn || screenSharing,
        speaking: speaking.has('self'),
        connecting: false,
        screenSharing,
      },
      ...state.peers.map((peer) => ({
        key: peer.sessionId,
        name: peer.name,
        stream: remoteStreams.get(peer.sessionId) ?? null,
        isSelf: false,
        muted: peer.muted,
        cameraOn: (peer.cameraOn || peer.screenSharing) && !audioMode,
        speaking: speaking.has(peer.sessionId),
        connecting: !['connected', 'closed'].includes(
          connectionStates.get(peer.sessionId) ?? 'new',
        ),
        screenSharing: peer.screenSharing,
      })),
    ],
    [
      selfName,
      selfViewStream,
      muted,
      cameraOn,
      screenSharing,
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
          <Box
            key={tile.key}
            sx={
              // Демонстрация экрана — «сцена»: плитка на всю ширину сетки
              tile.screenSharing
                ? { gridColumn: '1 / -1', order: -1 }
                : undefined
            }
          >
            <VideoTile
              stream={tile.stream}
              name={tile.name}
              isSelf={tile.isSelf}
              muted={tile.muted}
              cameraOn={tile.cameraOn}
              speaking={tile.speaking}
              connecting={tile.connecting}
              screenSharing={tile.screenSharing}
            />
          </Box>
        ))}
      </Box>

      <MeetControls
        muted={muted}
        cameraOn={cameraOn}
        audioMode={audioMode}
        screenSharing={screenSharing}
        chatOpen={chatOpen}
        chatUnread={chatUnread}
        participantsOpen={participantsOpen}
        participantsCount={state.peers.length + 1}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleAudioMode={() => setAudioMode(!audioMode)}
        onToggleScreenShare={() =>
          void (screenSharing ? stopScreenShare() : startScreenShare())
        }
        onToggleChat={() => setChatOpen((prev) => !prev)}
        onToggleParticipants={() => setParticipantsOpen((prev) => !prev)}
        onSelectMicrophone={(id) => void switchMicrophone(id)}
        onSelectCamera={(id) => void switchCamera(id)}
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
        onHostMute={hostMute}
        onHostRemove={hostRemove}
      />

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        chat={state.chat}
        selfSessionId={state.selfSessionId}
        onSend={sendChat}
      />
    </Stack>
  )
}
