import { afterEach, describe, expect, it, vi } from 'vitest'
import { accessMessage, acquireLocalMedia } from '../devices'

function domException(name: string): DOMException {
  return new DOMException('', name)
}

function mockMedia(getUserMedia: (constraints: MediaStreamConstraints) => Promise<unknown>) {
  vi.stubGlobal('RTCPeerConnection', class {})
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia, enumerateDevices: async () => [] },
  })
}

const fakeStream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] }

describe('acquireLocalMedia — деградация доступа к устройствам (§7 ADR)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('камера+микрофон доступны → granted', async () => {
    mockMedia(async () => fakeStream)
    const result = await acquireLocalMedia()
    expect(result.access).toBe('granted')
    expect(result.stream).toBe(fakeStream)
  })

  it('камеры нет → фолбэк на только-звук (partial-audio)', async () => {
    mockMedia(async (constraints) => {
      if (constraints.video) throw domException('NotFoundError')
      return fakeStream
    })
    const result = await acquireLocalMedia()
    expect(result.access).toBe('partial-audio')
    expect(result.stream).toBe(fakeStream)
  })

  it('доступ запрещён → denied, потока нет', async () => {
    mockMedia(async () => {
      throw domException('NotAllowedError')
    })
    const result = await acquireLocalMedia()
    expect(result.access).toBe('denied')
    expect(result.stream).toBeNull()
  })

  it('устройств нет совсем → no-devices (вход recvonly разрешён)', async () => {
    mockMedia(async () => {
      throw domException('NotFoundError')
    })
    const result = await acquireLocalMedia()
    expect(result.access).toBe('no-devices')
  })

  it('браузер без WebRTC → unsupported', async () => {
    vi.stubGlobal('navigator', {})
    const result = await acquireLocalMedia()
    expect(result.access).toBe('unsupported')
  })

  it('у каждого проблемного состояния есть человеческое объяснение', () => {
    for (const access of ['denied', 'no-devices', 'partial-audio', 'unsupported'] as const)
      expect(accessMessage(access)).toBeTruthy()
    expect(accessMessage('granted')).toBeNull()
  })
})
