import { describe, it, expect } from 'vitest'
import { cutoutBox, virtualAnchor, isRectInViewport } from '../spotlightGeom'

describe('cutoutBox', () => {
  it('расширяет рект на padding во все стороны', () => {
    const box = cutoutBox({ top: 100, left: 50, width: 40, height: 20 }, 8)
    expect(box).toEqual({ top: 92, left: 42, width: 56, height: 36 })
  })
  it('padding по умолчанию = 8', () => {
    expect(cutoutBox({ top: 0, left: 0, width: 0, height: 0 })).toEqual({
      top: -8,
      left: -8,
      width: 16,
      height: 16,
    })
  })
})

describe('virtualAnchor', () => {
  it('getBoundingClientRect отражает бокс', () => {
    const a = virtualAnchor({ top: 10, left: 20, width: 100, height: 50 })
    const r = a.getBoundingClientRect()
    expect(r.top).toBe(10)
    expect(r.left).toBe(20)
    expect(r.right).toBe(120)
    expect(r.bottom).toBe(60)
    expect(r.width).toBe(100)
    expect(r.height).toBe(50)
  })
})

describe('isRectInViewport', () => {
  it('внутри — true', () => {
    expect(isRectInViewport({ top: 100, left: 0, width: 10, height: 100 }, 800)).toBe(true)
  })
  it('выше зоны — false', () => {
    expect(isRectInViewport({ top: 5, left: 0, width: 10, height: 10 }, 800)).toBe(false)
  })
  it('ниже зоны — false', () => {
    expect(isRectInViewport({ top: 790, left: 0, width: 10, height: 40 }, 800)).toBe(false)
  })
})
