import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SignalEvents } from '../core/signal'

/**
 * ТП-177 (ST-2): mute без утечки звука.
 * - toggleMute мгновенно гасит ВСЕ аудиотреки (`enabled=false`) — по
 *   спецификации WebRTC отключённый трек выдаёт тишину: регресс «в mute
 *   исходящий звук — тишина, а не реальный сигнал»;
 * - состояние рассылается участникам (type:'state');
 * - после свежего hello (вход/реконнект) текущее состояние отправляется
 *   ЗАНОВО — на сервере новая сессия имеет дефолтный peer, без ресинка
 *   mute «отлипал» бы у других участников.
 */

const sent: Array<Record<string, unknown>> = []
let capturedEvents: SignalEvents | null = null

vi.mock('../core/signal', () => ({
  MeetSignalClient: class {
    constructor(_buildUrl: () => string, events: SignalEvents) {
      capturedEvents = events
    }
    connect() {}
    close() {}
    send(message: Record<string, unknown>) {
      sent.push(message)
    }
  },
}))

vi.mock('../core/rtc', () => ({
  RtcManager: class {
    setLocalStream() {}
    connectTo() {}
    reset() {}
    drop() {}
    connectionsCount() {
      return 0
    }
  },
}))

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: {
    meet: {
      getIceServers: () => Promise.resolve({ data: { iceServers: [] } }),
      sendStats: () => Promise.resolve({}),
    },
  },
}))

vi.mock('@/shared/api/token', () => ({ getAccessToken: () => 'jwt' }))

import { useMeetSession } from '../useMeetSession'

function fakeAudioTrack(): MediaStreamTrack {
  return { kind: 'audio', enabled: true, stop: vi.fn() } as unknown as MediaStreamTrack
}

function fakeStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getTracks: () => tracks,
  } as unknown as MediaStream
}

describe('useMeetSession — mute (ТП-177 ST-2)', () => {
  beforeEach(() => {
    sent.length = 0
    capturedEvents = null
  })

  it('toggleMute гасит все аудиотреки и рассылает state; unmute мгновенно возвращает', () => {
    const track = fakeAudioTrack()
    const stream = fakeStream([track])
    const { result } = renderHook(() =>
      useMeetSession({ roomToken: 'room', localStream: stream, active: true }),
    )

    act(() => result.current.toggleMute())
    expect(track.enabled).toBe(false) // тишина на исходящем треке
    expect(result.current.muted).toBe(true)
    expect(sent).toContainEqual(expect.objectContaining({ type: 'state', muted: true }))

    act(() => result.current.toggleMute())
    expect(track.enabled).toBe(true) // unmute без переполучения потока
    expect(result.current.muted).toBe(false)
  })

  it('после hello клиент ресинкает своё состояние (реконнект не «отлепляет» mute)', () => {
    const stream = fakeStream([fakeAudioTrack()])
    const { result } = renderHook(() =>
      useMeetSession({ roomToken: 'room', localStream: stream, active: true }),
    )
    act(() => result.current.toggleMute())
    sent.length = 0

    act(() => {
      capturedEvents!.onMessage({
        type: 'hello',
        self: 's1',
        selfUserId: 'u1',
        host: 'u1',
        roomTitle: 'Комната',
        maxParticipants: 8,
        peers: [],
      })
    })

    expect(sent).toContainEqual(
      expect.objectContaining({ type: 'state', muted: true, cameraOn: true }),
    )
  })
})
