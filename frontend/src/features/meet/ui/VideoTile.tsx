import { useEffect, useRef } from 'react'
import { Avatar, Box, CircularProgress, Stack, Typography } from '@mui/material'
import MicOffIcon from '@mui/icons-material/MicOff'
import { stage } from './stage'

type Props = {
  stream?: MediaStream | null
  name: string
  isSelf?: boolean
  muted: boolean
  cameraOn: boolean
  speaking?: boolean
  /** Транспорт пары ещё устанавливается/восстанавливается. */
  connecting?: boolean
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
 * Плитка участника: видео или инициалы, бейджи имени/микрофона, рамка
 * говорящего. Самопревью всегда без звука (эхо) и зеркалится — как во всех
 * зрелых видеосервисах.
 */
export function VideoTile({
  stream,
  name,
  isSelf,
  muted,
  cameraOn,
  speaking,
  connecting,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream ?? null
    return () => {
      video.srcObject = null
    }
  }, [stream])

  const showVideo = !!stream && cameraOn && stream.getVideoTracks().length > 0

  return (
    <Box
      role="group"
      aria-label={`Участник: ${name}${muted ? ', микрофон выключен' : ''}`}
      sx={{
        position: 'relative',
        aspectRatio: '16 / 9',
        minWidth: 0,
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: stage.tile,
        border: '1px solid',
        borderColor: speaking ? stage.speakingRing : stage.tileBorder,
        boxShadow: speaking ? `0 0 0 2px ${stage.speakingRing}` : 'none',
        transition: 'box-shadow 120ms ease, border-color 120ms ease',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'block' : 'none',
          transform: isSelf ? 'scaleX(-1)' : undefined,
        }}
      />
      {!showVideo && (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ position: 'absolute', inset: 0 }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              fontSize: 24,
              bgcolor: 'var(--wt-accent)',
              color: '#fff',
            }}
          >
            {initials(name)}
          </Avatar>
        </Stack>
      )}
      {connecting && (
        <Stack
          alignItems="center"
          justifyContent="center"
          gap={1}
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(16, 18, 22, 0.6)',
          }}
        >
          <CircularProgress size={28} sx={{ color: stage.text }} />
          <Typography variant="caption" sx={{ color: stage.textMuted }}>
            Подключение…
          </Typography>
        </Stack>
      )}
      <Stack
        direction="row"
        alignItems="center"
        gap={0.5}
        sx={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          maxWidth: 'calc(100% - 16px)',
          px: 1,
          py: 0.25,
          borderRadius: 1,
          backgroundColor: stage.badgeBg,
        }}
      >
        {muted && <MicOffIcon sx={{ fontSize: 14, color: '#f28b82' }} />}
        <Typography
          variant="caption"
          noWrap
          sx={{ color: stage.text, fontWeight: 500 }}
        >
          {name}
          {isSelf ? ' (вы)' : ''}
        </Typography>
      </Stack>
    </Box>
  )
}
