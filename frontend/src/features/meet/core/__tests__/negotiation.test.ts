import { describe, expect, it } from 'vitest'
import { isPolite, isRecoveryInitiator, shouldAcceptOffer } from '../negotiation'

describe('perfect negotiation — правила пары', () => {
  it('вежливость консистентна: ровно одна сторона пары вежлива', () => {
    expect(isPolite('s-aaa', 's-bbb')).toBe(true)
    expect(isPolite('s-bbb', 's-aaa')).toBe(false)
    // Обе стороны вычисляют один и тот же вывод независимо
    expect(isPolite('s-aaa', 's-bbb')).not.toBe(isPolite('s-bbb', 's-aaa'))
  })

  it('без коллизии offer принимают обе стороны', () => {
    for (const polite of [true, false])
      expect(
        shouldAcceptOffer({ polite, makingOffer: false, signalingStable: true }),
      ).toBe(true)
  })

  it('при glare уступает только вежливая сторона', () => {
    expect(
      shouldAcceptOffer({ polite: true, makingOffer: true, signalingStable: false }),
    ).toBe(true)
    expect(
      shouldAcceptOffer({ polite: false, makingOffer: true, signalingStable: false }),
    ).toBe(false)
    expect(
      shouldAcceptOffer({ polite: false, makingOffer: false, signalingStable: false }),
    ).toBe(false)
  })

  it('восстановление после failed инициирует ровно одна сторона', () => {
    expect(isRecoveryInitiator('s-aaa', 's-bbb')).not.toBe(
      isRecoveryInitiator('s-bbb', 's-aaa'),
    )
  })
})
