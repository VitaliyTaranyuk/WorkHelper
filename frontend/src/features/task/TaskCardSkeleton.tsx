import { Stack } from '@mui/material'
import {
  SkeletonField,
  SkeletonLine,
  SkeletonParagraph,
} from '@/shared/ui/components/Skeleton'

/**
 * Скелетон карточки задачи (ТП-185, skeleton-first). Показывается, пока
 * задача грузится по коду (открытие из уведомления) — вместо блокирующего
 * центрированного спиннера. Повторяет двухколоночную раскладку
 * TaskCardContent: слева название + описание + активность, справа —
 * метаданные. Пользователь видит структуру карточки мгновенно, данные
 * приезжают в фон.
 */
export function TaskCardSkeleton() {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      gap={3}
      sx={{ pt: 1 }}
      aria-label="Загрузка карточки задачи"
    >
      <Stack sx={{ flex: 1, minWidth: 0 }} gap={2}>
        <SkeletonLine width="70%" height={28} />
        <Stack gap={1}>
          <SkeletonLine width={90} height={12} />
          <SkeletonParagraph lines={5} />
        </Stack>
        <Stack gap={1} sx={{ mt: 1 }}>
          <SkeletonLine width={120} height={16} />
          <SkeletonParagraph lines={3} />
        </Stack>
      </Stack>
      <Stack sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }} gap={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonField key={i} />
        ))}
      </Stack>
    </Stack>
  )
}
