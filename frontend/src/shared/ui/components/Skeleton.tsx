import { Skeleton, Stack } from '@mui/material'

/**
 * Скелетоны загрузки (ТП-185, стандарт «skeleton-first»). Общие примитивы:
 * поверхность открывается МГНОВЕННО с каркасом раскладки, а не блокирующим
 * спиннером — данные приезжают в фон. Переиспользуются новыми модалками и
 * панелями (Definition of Done: без skeleton-first поверхность не уходит в
 * Done). Цвет наследуется из темы MUI (`--wt-*`), работает в светлой/тёмной.
 */

/** Строка текста заданной ширины. */
export function SkeletonLine({
  width = '100%',
  height = 16,
}: {
  width?: number | string
  height?: number
}) {
  return <Skeleton variant="rounded" width={width} height={height} />
}

/** Блок из нескольких строк — под абзац/описание. */
export function SkeletonParagraph({ lines = 3 }: { lines?: number }) {
  return (
    <Stack gap={0.75}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </Stack>
  )
}

/** Пара «подпись + значение» — под строку метаданных боковой панели. */
export function SkeletonField() {
  return (
    <Stack gap={0.5}>
      <SkeletonLine width={80} height={12} />
      <SkeletonLine width="70%" height={20} />
    </Stack>
  )
}
