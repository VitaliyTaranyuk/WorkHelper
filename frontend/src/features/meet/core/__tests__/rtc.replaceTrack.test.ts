import { describe, expect, it, vi } from 'vitest'
import { RtcManager } from '../rtc'
import type { MeetPeer } from '../types'

/**
 * M4: замена исходящего трека (смена устройства / демонстрация экрана).
 * Вход с камерой — replaceTrack у sender'а; вход без камеры (recvonly) —
 * отправка через существующий трансивер с поднятием направления.
 */

type FakeSender = {
  track: { kind: string } | null
  replaceTrack: ReturnType<typeof vi.fn>
}

function fakePc() {
  const senders: FakeSender[] = []
  const transceivers: Array<{
    direction: string
    receiver: { track: { kind: string } }
    sender: FakeSender
  }> = []
  return {
    senders,
    transceivers,
    addTrack(track: { kind: string }) {
      const sender: FakeSender = { track, replaceTrack: vi.fn() }
      senders.push(sender)
      transceivers.push({
        direction: 'sendrecv',
        receiver: { track: { kind: track.kind } },
        sender,
      })
    },
    addTransceiver(kind: string, init?: { direction?: string }) {
      const sender: FakeSender = { track: null, replaceTrack: vi.fn() }
      senders.push(sender)
      transceivers.push({
        direction: init?.direction ?? 'sendrecv',
        receiver: { track: { kind } },
        sender,
      })
    },
    getSenders: () => senders,
    getTransceivers: () => transceivers,
    close: vi.fn(),
    onnegotiationneeded: null,
    onicecandidate: null,
    ontrack: null,
    oniceconnectionstatechange: null,
    onconnectionstatechange: null,
    signalingState: 'stable',
  } as unknown as RTCPeerConnection & {
    senders: FakeSender[]
    transceivers: Array<{ direction: string; receiver: { track: { kind: string } }; sender: FakeSender }>
  }
}

const peer = (sessionId: string): MeetPeer => ({
  sessionId,
  userId: 'u',
  name: 'N',
  muted: false,
  cameraOn: true,
  screenSharing: false,
  joinedAt: 1,
})

const stream = (kinds: string[]) =>
  ({
    getTracks: () => kinds.map((kind) => ({ kind, enabled: true })),
    getAudioTracks: () => kinds.filter((k) => k === 'audio').map((kind) => ({ kind })),
    getVideoTracks: () => kinds.filter((k) => k === 'video').map((kind) => ({ kind })),
  }) as unknown as MediaStream

describe('RtcManager — замена исходящих треков (M4)', () => {
  it('с камерой: экранный трек замещает видео через sender.replaceTrack', async () => {
    const pc = fakePc()
    const manager = new RtcManager([], 's-me', () => undefined, {
      onRemoteStream: () => undefined,
      onConnectionState: () => undefined,
      onStats: () => undefined,
    }, () => pc)
    manager.setLocalStream(stream(['audio', 'video']))
    manager.connectTo(peer('s-a'))

    const screenTrack = { kind: 'video' } as MediaStreamTrack
    await manager.replaceVideoTrack(screenTrack)

    const videoSender = pc.senders.find((s) => s.track?.kind === 'video')!
    expect(videoSender.replaceTrack).toHaveBeenCalledWith(screenTrack)
  })

  it('без камеры (recvonly): направление поднимается до sendrecv', async () => {
    const pc = fakePc()
    const manager = new RtcManager([], 's-me', () => undefined, {
      onRemoteStream: () => undefined,
      onConnectionState: () => undefined,
      onStats: () => undefined,
    }, () => pc)
    manager.setLocalStream(stream(['audio'])) // видео нет → recvonly-трансивер
    manager.connectTo(peer('s-a'))

    const videoTransceiver = pc.transceivers.find(
      (t) => t.receiver.track.kind === 'video',
    )!
    expect(videoTransceiver.direction).toBe('recvonly')

    const screenTrack = { kind: 'video' } as MediaStreamTrack
    await manager.replaceVideoTrack(screenTrack)

    expect(videoTransceiver.sender.replaceTrack).toHaveBeenCalledWith(screenTrack)
    expect(videoTransceiver.direction).toBe('sendrecv')
  })

  it('смена микрофона: replaceTrack аудио-sender, видео не тронуто', async () => {
    const pc = fakePc()
    const manager = new RtcManager([], 's-me', () => undefined, {
      onRemoteStream: () => undefined,
      onConnectionState: () => undefined,
      onStats: () => undefined,
    }, () => pc)
    manager.setLocalStream(stream(['audio', 'video']))
    manager.connectTo(peer('s-a'))

    const mic = { kind: 'audio' } as MediaStreamTrack
    await manager.replaceAudioTrack(mic)

    const audioSender = pc.senders.find((s) => s.track?.kind === 'audio')!
    const videoSender = pc.senders.find((s) => s.track?.kind === 'video')!
    expect(audioSender.replaceTrack).toHaveBeenCalledWith(mic)
    expect(videoSender.replaceTrack).not.toHaveBeenCalled()
  })
})
