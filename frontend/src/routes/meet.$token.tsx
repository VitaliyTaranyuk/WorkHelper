import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, CircularProgress, Stack, Typography } from '@mui/material'
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined'
import { workTechApi } from '@/shared/api/endpoint'
import { useAuthStore } from '@/features/auth/authStore'
import { useLocalMedia } from '@/features/meet/useLocalMedia'
import { useMeetSession } from '@/features/meet/useMeetSession'
import { MeetLobby } from '@/features/meet/ui/MeetLobby'
import { MeetCall } from '@/features/meet/ui/MeetCall'
import type { MeetRefusal } from '@/features/meet/core/types'

export const Route = createFileRoute('/meet/$token')({
  component: MeetPage,
})

const REFUSAL_TEXT: Record<MeetRefusal, { title: string; hint: string }> = {
  ROOM_FULL: {
    title: 'Встреча заполнена',
    hint: 'Достигнут предел участников. Попробуйте позже — место освободится, когда кто-то выйдет.',
  },
  REMOVED: {
    title: 'Организатор удалил вас из встречи',
    hint: 'Вернуться в эту встречу можно будет, когда она соберётся заново.',
  },
  AUTH: {
    title: 'Нет доступа к встрече',
    hint: 'Встреча принадлежит проекту, в котором вас нет. Попросите приглашение в проект.',
  },
  GONE: {
    title: 'Встреча не найдена',
    hint: 'Ссылка недействительна или встреча завершена.',
  },
}

/**
 * Страница встречи /meet/{token} (M3). Полноэкранная, вне DashboardLayout —
 * как самостоятельное окно звонка. Гость отправляется на вход с возвратом
 * сюда (паттерн invite). Состояния: загрузка → отказ (честный экран) →
 * лобби → звонок.
 */
function MeetPage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const selfName = useAuthStore((s) => {
    const user = s.user
    if (!user) return 'Вы'
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Вы'
  })
  const [joined, setJoined] = useState(false)
  const [callStream, setCallStream] = useState<MediaStream | null>(null)
  const redirected = useRef(false)

  useEffect(() => {
    if (!isAuthenticated && !redirected.current) {
      redirected.current = true
      navigate({ to: '/login', search: { redirect: `/meet/${token}` } })
    }
  }, [isAuthenticated, navigate, token])

  const roomQuery = useQuery({
    queryKey: ['meet-room', token],
    queryFn: () => workTechApi.meet.getRoom({ token }).then((r) => r.data),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60_000,
  })

  const media = useLocalMedia()
  const session = useMeetSession({
    roomToken: token,
    localStream: callStream,
    active: joined,
  })

  if (!isAuthenticated) return null

  if (roomQuery.isPending)
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="100dvh" gap={2}>
        <CircularProgress size={32} />
        <Typography color="text.secondary">Открываем встречу…</Typography>
      </Stack>
    )

  if (roomQuery.isError || session.state.refusal) {
    const status = (roomQuery.error as { response?: { status?: number } } | null)
      ?.response?.status
    const refusal: MeetRefusal =
      session.state.refusal ?? (status === 404 ? 'GONE' : 'AUTH')
    const text = REFUSAL_TEXT[refusal]
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="100dvh" gap={2} px={2}>
        <VideocamOffOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
        <Typography variant="h5" fontWeight={600} textAlign="center">
          {text.title}
        </Typography>
        <Typography color="text.secondary" textAlign="center" maxWidth={480}>
          {text.hint}
        </Typography>
        <Button variant="contained" onClick={() => navigate({ to: '/main' })}>
          К задачам
        </Button>
      </Stack>
    )
  }

  const room = roomQuery.data

  if (!joined)
    return (
      <MeetLobby
        room={room}
        stream={media.stream}
        access={media.access}
        microphones={media.microphones}
        cameras={media.cameras}
        audioDeviceId={media.audioDeviceId}
        videoDeviceId={media.videoDeviceId}
        onSelectMicrophone={media.selectMicrophone}
        onSelectCamera={media.selectCamera}
        onRetry={media.retry}
        onJoin={() => {
          // Поток переходит во владение звонка: cleanup лобби его не тронет
          setCallStream(media.takeStream())
          setJoined(true)
        }}
      />
    )

  return (
    <MeetCall
      room={room}
      selfName={selfName}
      localStream={callStream}
      session={session}
      onLeave={() => {
        session.leave()
        setJoined(false)
        setCallStream(null)
        navigate({ to: '/main' })
      }}
    />
  )
}
