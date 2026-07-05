import type { ReactNode } from 'react'

/**
 * Шаг spotlight-тура (ТП-118). Универсальный примитив coach-marks: подсвечивает
 * элемент интерфейса и объясняет одно текущее действие. Переиспользуется для
 * любых будущих онбордингов, не только голосового.
 */
export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto'

export type TourStep = {
  id: string
  /** CSS-селектор подсвечиваемого элемента. Нет цели → карточка по центру. */
  target?: string
  title: string
  body: ReactNode
  placement?: TourPlacement
  /**
   * Шаг продвигается не кнопкой «Далее», а программно — когда пользователь
   * выполнит действие (например, голосовую команду). Кнопка «Далее» скрыта.
   */
  waitForEvent?: boolean
  /** Отступ подсветки вокруг элемента, px (по умолчанию 8). */
  spotlightPadding?: number
}
