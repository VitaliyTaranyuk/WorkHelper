/**
 * Чистая геометрия spotlight-подсветки (ТП-118). Вынесено из React-компонента,
 * чтобы расчёты «дырки» и виртуального якоря для Popper покрывались тестами.
 */

export type Rect = {
  top: number
  left: number
  width: number
  height: number
}

export type Box = { top: number; left: number; width: number; height: number }

/** Прямоугольник подсветки = рект элемента, расширенный на padding во все стороны. */
export function cutoutBox(rect: Rect, padding = 8): Box {
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

/**
 * Виртуальный якорь для MUI Popper: объект с getBoundingClientRect(), чтобы
 * позиционировать всплывающую карточку у произвольного прямоугольника (без
 * реального DOM-элемента-якоря).
 */
export function virtualAnchor(box: Box): {
  getBoundingClientRect: () => DOMRect
} {
  const rect = {
    x: box.left,
    y: box.top,
    top: box.top,
    left: box.left,
    right: box.left + box.width,
    bottom: box.top + box.height,
    width: box.width,
    height: box.height,
    toJSON() {
      return this
    },
  }
  return { getBoundingClientRect: () => rect as DOMRect }
}

/** Пересекает ли прямоугольник вертикальный диапазон видимой области (для scrollIntoView-решения). */
export function isRectInViewport(
  rect: Rect,
  viewportHeight: number,
  margin = 24,
): boolean {
  return rect.top >= margin && rect.top + rect.height <= viewportHeight - margin
}
