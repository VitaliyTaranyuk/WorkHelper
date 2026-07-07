import { afterEach, describe, expect, it, vi } from 'vitest'
import { accessMessage, acquireLocalMedia, cleanDeviceLabel } from '../devices'

/**
 * ТП-189: служебный USB-идентификатор VID:PID, дописываемый Chrome в конец
 * label, убирается; осмысленные названия со скобками — сохраняются.
 */
describe('cleanDeviceLabel', () => {
  it('срезает хвост (vid:pid)', () => {
    expect(cleanDeviceLabel('HD Pro Webcam C920 (046d:082d)')).toBe(
      'HD Pro Webcam C920',
    )
    expect(cleanDeviceLabel('Микрофон (046d:0825)')).toBe('Микрофон')
  })

  it('не трогает осмысленные скобки и не-VID:PID хвосты', () => {
    expect(cleanDeviceLabel('Микрофон (Realtek(R) Audio)')).toBe(
      'Микрофон (Realtek(R) Audio)',
    )
    expect(cleanDeviceLabel('Default - Микрофон')).toBe('Default - Микрофон')
    expect(cleanDeviceLabel('Camera (front)')).toBe('Camera (front)')
  })

  it('пустой результат после чистки — оставляет исходный label', () => {
    expect(cleanDeviceLabel('(046d:082d)')).toBe('(046d:082d)')
  })
})

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
