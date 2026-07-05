import { useEffect, useState } from 'react'
import type { Rect } from './spotlightGeom'

/**
 * Отслеживает положение подсвечиваемого элемента по CSS-селектору (ТП-118):
 * прокручивает его в зону видимости, возвращает актуальный прямоугольник и
 * пересчитывает при скролле/ресайзе. Лёгкий поллинг покрывает случаи, когда
 * элемент появляется/сдвигается после навигации (доска, страница задачи).
 * Нет элемента → null (Spotlight покажет карточку по центру).
 */
export function useAnchorRect(
  selector: string | undefined,
  active: boolean,
): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!active || !selector) {
      setRect(null)
      return
    }

    let raf = 0
    const measure = () => {
      const el = document.querySelector(selector)
      if (!el) {
        setRect((prev) => (prev === null ? prev : null))
        return
      }
      const r = el.getBoundingClientRect()
      setRect((prev) => {
        if (
          prev &&
          prev.top === r.top &&
          prev.left === r.left &&
          prev.width === r.width &&
          prev.height === r.height
        ) {
          return prev
        }
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      })
    }

    document
      .querySelector(selector)
      ?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    measure()

    const onChange = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onChange, true)
    window.addEventListener('resize', onChange)
    const interval = window.setInterval(measure, 300)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onChange, true)
      window.removeEventListener('resize', onChange)
      clearInterval(interval)
    }
  }, [selector, active])

  return rect
}
