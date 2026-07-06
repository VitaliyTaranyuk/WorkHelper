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

  const signalRef = useRef<MeetSignalClient | null>(null)
  const rtcRef = useRef<RtcManager | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const wasReconnectingRef = useRef(false)
  localStreamRef.current = localStream

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

  const hostMute = useCallback((target: string) => {
    signalRef.current?.send({ type: 'host-mute', target })
  }, [])

  const hostRemove = useCallback((target: string) => {
    signalRef.current?.send({ type: 'host-remove', target })
  }, [])

  const leave = useCallback(() => {
    signalRef.current?.close()
    rtcRef.current?.reset()
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
    selfIsHost,
    toggleMute,
    toggleCamera,
    setAudioMode,
    sendChat,
    hostMute,
    hostRemove,
    leave,
  }
}
