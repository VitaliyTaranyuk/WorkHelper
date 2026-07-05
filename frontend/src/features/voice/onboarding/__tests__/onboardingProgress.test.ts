import { describe, it, expect, beforeEach } from 'vitest'
import {
  getProgress,
  setProgress,
  resetProgress,
  parseProgress,
  shouldOffer,
  DEFAULT_PROGRESS,
} from '../onboardingProgress'

beforeEach(() => {
  localStorage.clear()
})

describe('parseProgress', () => {
  it('мусор → значения по умолчанию', () => {
    expect(parseProgress(null)).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress('nope')).toEqual(DEFAULT_PROGRESS)
    expect(parseProgress({ status: 'weird', stage: 'x' })).toEqual(
      DEFAULT_PROGRESS,
    )
  })

  it('валидные поля сохраняются', () => {
    const p = parseProgress({
      status: 'in_progress',
      stage: 'calibration',
      updatedAt: 123,
    })
    expect(p.status).toBe('in_progress')
    expect(p.stage).toBe('calibration')
    expect(p.updatedAt).toBe(123)
  })
})

describe('get/set/reset', () => {
  it('по умолчанию — not_started', () => {
    expect(getProgress().status).toBe('not_started')
  })

  it('setProgress сохраняет и проставляет updatedAt', () => {
    const before = Date.now()
    const p = setProgress({ status: 'in_progress', stage: 'hardware' })
    expect(p.status).toBe('in_progress')
    expect(p.stage).toBe('hardware')
    expect(p.updatedAt).toBeGreaterThanOrEqual(before)
    // перечитывание из хранилища даёт то же
    expect(getProgress().stage).toBe('hardware')
  })

  it('частичный patch не сбрасывает остальные поля', () => {
    setProgress({ status: 'in_progress', stage: 'practice' })
    setProgress({ status: 'completed' })
    const p = getProgress()
    expect(p.status).toBe('completed')
    expect(p.stage).toBe('practice')
  })

  it('reset возвращает к умолчанию', () => {
    setProgress({ status: 'completed', stage: 'done' })
    resetProgress()
    expect(getProgress().status).toBe('not_started')
  })

  it('битый JSON в хранилище → умолчание, без исключения', () => {
    localStorage.setItem('voice.onboarding.v2', '{not json')
    expect(getProgress()).toEqual(DEFAULT_PROGRESS)
  })
})

describe('shouldOffer', () => {
  it('предлагаем на not_started и later', () => {
    expect(shouldOffer({ ...DEFAULT_PROGRESS, status: 'not_started' })).toBe(true)
    expect(shouldOffer({ ...DEFAULT_PROGRESS, status: 'later' })).toBe(true)
  })
  it('не предлагаем на skipped/completed/in_progress', () => {
    expect(shouldOffer({ ...DEFAULT_PROGRESS, status: 'skipped' })).toBe(false)
    expect(shouldOffer({ ...DEFAULT_PROGRESS, status: 'completed' })).toBe(false)
    expect(shouldOffer({ ...DEFAULT_PROGRESS, status: 'in_progress' })).toBe(
      false,
    )
  })
})
