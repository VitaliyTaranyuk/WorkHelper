import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpeakingDetection } from '../useSpeakingDetection'

/**
 * ТП-177 (ST-1): единый анализатор уровня — детект говорящего и уровень
 * собственного микрофона. Мокаем Web Audio: амплитуда задаётся тестом.
 */

let currentAmplitude = 0 // 0..127 отклонение от тишины (128)

class FakeAnalyser {
  fftSize = 512
  getByteTimeDomainData(data: Uint8Array) {
    data.fill(128 + currentAmplitude)
  }
  disconnect() {}
}

class FakeAudioContext {
  resume() {
    return Promise.resolve()
  }
  close() {
    return Promise.resolve()
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() }
  }
  createAnalyser() {
    return new FakeAnalyser()
  }
}

function fakeStream(): MediaStream {
  return {
    getAudioTracks: () => [{ kind: 'audio' }],
  } as unknown as MediaStream
}

describe('useSpeakingDetection (ТП-177 ST-1)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioContext', FakeAudioContext)
    currentAmplitude = 0
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('речь включает подсветку self и оживляет уровень; тишина — гасит (порог, без дрожания)', () => {
    const local = fakeStream()
    // Map стабильна между рендерами (в проде это state) — иначе эффект
    // перезапускается на каждый ререндер и сбрасывает уровень.
    const remote = new Map<string, MediaStream>()
    const { result } = renderHook(() =>
      useSpeakingDetection(remote, local, false),
    )

    currentAmplitude = 40 // громкая речь (RMS ≈ 0.31)
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.speaking.has('self')).toBe(true)
    expect(result.current.selfLevelRef.current).toBeGreaterThan(0.3)

    currentAmplitude = 1 // фоновый шум ниже порога (RMS ≈ 0.008)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.speaking.has('self')).toBe(false)
    expect(result.current.selfLevelRef.current).toBeLessThan(0.1)
  })

  it('в mute уровень не отображается и self не подсвечивается — даже при сигнале', () => {
    const local = fakeStream()
    const remoteEmpty = new Map<string, MediaStream>()
    const { result } = renderHook(() =>
      useSpeakingDetection(remoteEmpty, local, true),
    )
    currentAmplitude = 40
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.speaking.has('self')).toBe(false)
    expect(result.current.selfLevelRef.current).toBe(0)
  })

  it('удалённые дорожки детектятся независимо от локального mute', () => {
    const remote = new Map([['peer-1', fakeStream()]])
    const { result } = renderHook(() =>
      useSpeakingDetection(remote, null, true),
    )
    currentAmplitude = 40
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.speaking.has('peer-1')).toBe(true)
  })
})
