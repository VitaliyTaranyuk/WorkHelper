import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { workTechApi } from '@/shared/api/endpoint'
import type { IceServer } from '@/shared/api/endpoint/meetApi'
import { getAccessToken } from '@/shared/api/token'
import { notify as toast } from '@/shared/ui/notify'
import { buildMeetWsUrl } from './core/wsUrl'
import { MeetSignalClient } from './core/signal'
import { RtcManager } from './core/rtc'
import { initialRoomState, isSelfHost, roomReducer } from './core/peers'
import { stopStream } from './core/devices'
import type { SignalIn, SignalStatus } from './core/types'

/**
 * Оркестратор звонка (M3): сигналинг + mesh WebRTC + локальные медиа в одном
 * состоянии для UI. Сигнальный клиент переживает обрывы (backoff), свежий
 * hello пересобирает peer-соединения; фатальные отказы (бан/переполнение)
 * попадают в state.refusal.
 */
export function useMeetSession(params: {
  roomToken: string
  localStream: MediaStream | null
  active: boolean
}) {
  const { roomToken, localStream, active } = params
  const [state, dispatch] = useReducer(roomReducer, initialRoomState)
  const [signalStatus, setSignalStatus] = useState<SignalStatus>('connecting')
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    () => new Map(),
  )
  const [connectionStates, setConnectionStates] = useState<
    Map<string, RTCPeerConnectionState>
  >(() => new Map())
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [audioMode, setAudioModeState] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)

  const signalRef = useRef<MeetSignalClient | null>(null)
  const rtcRef = useRef<RtcManager | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const wasReconnectingRef = useRef(false)
  localStreamRef.current = localStream
  // ТП-177 (ST-2): актуальное медиа-состояние для ресинка после hello —
  // onMessage создаётся один раз, читать React-state из замыкания нельзя.
  const mediaStateRef = useRef({ muted, cameraOn, screenSharing })
  mediaStateRef.current = { muted, cameraOn, screenSharing }

  const sendStats = useCallback(
    (event: 'connected' | 'ice-failed' | 'reconnected', setupMs?: number) => {
      void workTechApi.meet
        .sendStats({
          token: roomToken,
          data: { event, setupMs, peers: rtcRef.current?.connectionsCount() },
        })
        .catch(() => undefined) // метрика не должна ломать звонок
    },
    [roomToken],
  )

  useEffect(() => {
    if (!active) return

    let disposed = false
    const client = new MeetSignalClient(
      () => buildMeetWsUrl(roomToken, getAccessToken() ?? ''),
      {
        onStatus: (status) => {
          if (disposed) return
          setSignalStatus(status)
          if (status === 'reconnecting') wasReconnectingRef.current = true
          if (status === 'connected' && wasReconnectingRef.current) {
            wasReconnectingRef.current = false
            sendStats('reconnected')
          }
        },
        onMessage: (message: SignalIn) => {
          if (disposed) return
          if (message.type === 'hello') {
            // Свежая сессия сигналинга: старые пары мертвы, mesh собирается заново
            rtcRef.current?.reset()
            setRemoteStreams(new Map())
            setConnectionStates(new Map())
            // ТП-177 (ST-2): на сервере новая сессия завела peer с дефолтным
            // состоянием — рассылаем актуальное mute/камеру/экран, чтобы после
            // входа из лобби или реконнекта состояние не «отлипало» у других.
            client.send({ type: 'state', ...mediaStateRef.current })
            const iceServersPromise = workTechApi.meet
              .getIceServers()
              .then((r) => r.data.iceServers)
              .catch((): IceServer[] => [])
            void iceServersPromise.then((servers) => {
              if (disposed) return
              const manager = new RtcManager(
                servers.map((s) => ({
                  urls: s.urls,
                  username: s.username ?? undefined,
                  credential: s.credential ?? undefined,
                })),
                message.self,
                (out) => client.send(out),
                {
                  onRemoteStream: (sessionId, stream) =>
                    setRemoteStreams((prev) =>
                      new Map(prev).set(sessionId, stream),
                    ),
                  onConnectionState: (sessionId, connectionState) =>
                    setConnectionStates((prev) =>
                      new Map(prev).set(sessionId, connectionState),
                    ),
                  onStats: (event, detail) => sendStats(event, detail.setupMs),
                },
              )
              manager.setLocalStream(localStreamRef.current)
              rtcRef.current = manager
              // Новичок инициирует соединение с каждым присутствующим (§4)
              for (const peer of message.peers) manager.connectTo(peer)
            })
          }
          if (message.type === 'peer-left') {
            rtcRef.current?.drop(message.sessionId)
            setRemoteStreams((prev) => {
              const next = new Map(prev)
              next.delete(message.sessionId)
              return next
            })
          }
          if (message.type === 'offer')
            void rtcRef.current?.onOffer(message.from, message.sdp)
          if (message.type === 'answer')
            void rtcRef.current?.onAnswer(message.from, message.sdp)
          if (message.type === 'ice')
            void rtcRef.current?.onIce(message.from, message.candidate)
          dispatch({ kind: 'signal', message })
        },
      },
    )
    signalRef.current = client
    client.connect()

    return () => {
      disposed = true
      client.close()
      rtcRef.current?.reset()
      rtcRef.current = null
      signalRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, roomToken])

  // Организатор попросил выключить микрофон: выполняем self-mute (§6 ADR)
  useEffect(() => {
    if (!state.muteRequested) return
    dispatch({ kind: 'mute-request-handled' })
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = false))
    setMuted(true)
    signalRef.current?.send({ type: 'state', muted: true })
    toast.info('Организатор попросил вас выключить микрофон')
  }, [state.muteRequested])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      localStreamRef.current
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = !next))
      signalRef.current?.send({ type: 'state', muted: next })
      return next
    })
  }, [])

  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => {
      const next = !prev
      localStreamRef.current
        ?.getVideoTracks()
        .forEach((track) => (track.enabled = next))
      signalRef.current?.send({ type: 'state', cameraOn: next })
      return next
    })
  }, [])

  const setAudioMode = useCallback((enabled: boolean) => {
    setAudioModeState(enabled)
    rtcRef.current?.setAudioMode(enabled)
  }, [])

  const sendChat = useCallback((text: string) => {
    const trimmed = text.trim()
    if (trimmed) signalRef.current?.send({ type: 'chat', text: trimmed })
  }, [])

  const stopScreenShare = useCallback(async () => {
    const screen = screenStreamRef.current
    if (!screen) return
    screenStreamRef.current = null
    screen.getTracks().forEach((track) => track.stop())
    // Возвращаем в отправку текущую камеру (с учётом её вкл/выкл состояния)
    const camera = localStreamRef.current?.getVideoTracks()[0] ?? null
    await rtcRef.current?.replaceVideoTrack(camera)
    setScreenSharing(false)
    signalRef.current?.send({ type: 'state', screenSharing: false })
  }, [])

  /**
   * Демонстрация экрана (M4): экранный трек ЗАМЕЩАЕТ исходящее видео
   * (replaceTrack, без перенегоциации у имеющих камеру; вход без камеры —
   * поднимается направление recvonly-трансивера). Только по явному действию;
   * системная кнопка браузера «Закрыть доступ» тоже корректно завершает.
   */
  const startScreenShare = useCallback(async () => {
    if (screenStreamRef.current) return
    let display: MediaStream
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15 } },
        audio: false,
      })
    } catch {
      return // пользователь отменил выбор экрана — не ошибка
    }
    const track = display.getVideoTracks()[0]
    if (!track) return
    track.contentHint = 'detail' // текст/код важнее плавности (§7 ADR)
    track.onended = () => void stopScreenShare()
    screenStreamRef.current = display
    await rtcRef.current?.replaceVideoTrack(track)
    setScreenSharing(true)
    signalRef.current?.send({ type: 'state', screenSharing: true })
  }, [stopScreenShare])

  /** Смена микрофона прямо в звонке: replaceTrack, mute-состояние сохраняется. */
  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      const local = localStreamRef.current
      if (!local) return
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        })
        const next = fresh.getAudioTracks()[0]
        if (!next) return
        next.enabled = !muted
        const old = local.getAudioTracks()[0]
        if (old) {
          old.stop()
          local.removeTrack(old)
        }
        local.addTrack(next)
        await rtcRef.current?.replaceAudioTrack(next)
      } catch {
        toast.error('Не удалось переключить микрофон')
      }
    },
    [muted],
  )

  /** Смена камеры: во время демонстрации меняется только локальный трек. */
  const switchCamera = useCallback(
    async (deviceId: string) => {
      const local = localStreamRef.current
      if (!local) return
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        const next = fresh.getVideoTracks()[0]
        if (!next) return
        next.enabled = cameraOn
        const old = local.getVideoTracks()[0]
        if (old) {
          old.stop()
          local.removeTrack(old)
        }
        local.addTrack(next)
        if (!screenStreamRef.current)
          await rtcRef.current?.replaceVideoTrack(next)
      } catch {
        toast.error('Не удалось переключить камеру')
      }
    },
    [cameraOn],
  )

  const hostMute = useCallback((target: string) => {
    signalRef.current?.send({ type: 'host-mute', target })
  }, [])

  const hostRemove = useCallback((target: string) => {
    signalRef.current?.send({ type: 'host-remove', target })
  }, [])

  const leave = useCallback(() => {
    signalRef.current?.close()
    rtcRef.current?.reset()
    stopStream(screenStreamRef.current)
    screenStreamRef.current = null
    stopStream(localStreamRef.current)
  }, [])

  const selfIsHost = useMemo(() => isSelfHost(state), [state])

  return {
    state,
    signalStatus,
    remoteStreams,
    connectionStates,
    muted,
    cameraOn,
    audioMode,
    screenSharing,
    /** Что показывать на своей плитке: экран во время демонстрации. */
    selfViewStream: screenSharing ? screenStreamRef.current : localStream,
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
    leave,
  }
}
