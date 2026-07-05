import { describe, it, expect } from 'vitest'
import {
  rmsFromTimeDomain,
  displayLevel,
  smooth,
  hasSignal,
  mapMicError,
  calibrationVerdict,
  SIGNAL_THRESHOLD,
} from '../micLevel'

describe('rmsFromTimeDomain', () => {
  it('тишина (все 128) → 0', () => {
    expect(rmsFromTimeDomain(new Uint8Array(64).fill(128))).toBe(0)
  })

  it('пустой кадр → 0', () => {
    expect(rmsFromTimeDomain(new Uint8Array(0))).toBe(0)
  })

  it('полная амплитуда (0/255) → близко к 1', () => {
    const frame = Array.from({ length: 64 }, (_, i) => (i % 2 === 0 ? 0 : 255))
    expect(rmsFromTimeDomain(frame)).toBeGreaterThan(0.9)
  })

  it('громче → больше', () => {
    const quiet = new Uint8Array(64).fill(140)
    const loud = new Uint8Array(64).fill(200)
    expect(rmsFromTimeDomain(loud)).toBeGreaterThan(rmsFromTimeDomain(quiet))
  })
})

describe('displayLevel', () => {
  it('обрезается на 1', () => {
    expect(displayLevel(1)).toBe(1)
    expect(displayLevel(0.5, 10)).toBe(1)
  })
  it('0 и мусор → 0', () => {
    expect(displayLevel(0)).toBe(0)
    expect(displayLevel(NaN)).toBe(0)
    expect(displayLevel(-1)).toBe(0)
  })
})

describe('smooth', () => {
  it('движется к цели, не превышая её', () => {
    const s = smooth(0, 1, 0.4)
    expect(s).toBeCloseTo(0.4)
  })
  it('factor=1 → мгновенно', () => {
    expect(smooth(0, 0.7, 1)).toBeCloseTo(0.7)
  })
})

describe('hasSignal', () => {
  it('порог', () => {
    expect(hasSignal(SIGNAL_THRESHOLD)).toBe(true)
    expect(hasSignal(SIGNAL_THRESHOLD - 0.01)).toBe(false)
  })
})

describe('mapMicError', () => {
  it('NotAllowedError → denied + как разрешить', () => {
    const r = mapMicError({ name: 'NotAllowedError' })
    expect(r.permission).toBe('denied')
    expect(r.message).toMatch(/разрешите/i)
  })
  it('NotFoundError → granted, микрофон не найден', () => {
    const r = mapMicError({ name: 'NotFoundError' })
    expect(r.permission).toBe('granted')
    expect(r.message).toMatch(/не найден/i)
  })
  it('NotReadableError → занят другим приложением', () => {
    expect(mapMicError({ name: 'NotReadableError' }).message).toMatch(/занят/i)
  })
  it('неизвестная ошибка → unknown + общий совет', () => {
    const r = mapMicError(new Error('boom'))
    expect(r.permission).toBe('unknown')
    expect(r.message).toBeTruthy()
  })
})

describe('calibrationVerdict', () => {
  it('высокий уровень → success', () => {
    const v = calibrationVerdict(0.5)
    expect(v.ok).toBe(true)
    expect(v.tone).toBe('success')
  })
  it('тихо, но слышно → warning + ok', () => {
    const v = calibrationVerdict(0.2)
    expect(v.ok).toBe(true)
    expect(v.tone).toBe('warning')
  })
  it('нет сигнала → error, не ok', () => {
    const v = calibrationVerdict(0.02)
    expect(v.ok).toBe(false)
    expect(v.tone).toBe('error')
  })
})
