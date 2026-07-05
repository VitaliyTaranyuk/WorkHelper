import { createPortal } from 'react-dom'
import Box from '@mui/material/Box'
import Popper from '@mui/material/Popper'
import type { TourStep } from './tourTypes'
import { SpotlightCard } from './SpotlightCard'
import { useAnchorRect } from './useAnchorRect'
import { cutoutBox, virtualAnchor } from './spotlightGeom'

/**
 * Визуальная часть тура (ТП-118): затемняет экран, «вырезает» подсветку вокруг
 * целевого элемента (приём box-shadow с большим spread) и показывает карточку
 * шага у элемента (MUI Popper по виртуальному якорю) или по центру, если цели
 * нет. Затемнение не перехватывает клики (pointerEvents:none) — пользователь
 * может выполнить подсказанное действие (в т.ч. голосом), тур не блокирует UI.
 */
export function Spotlight({
  step,
  index,
  total,
  isFirst,
  isLast,
  onNext,
  onPrev,
  onSkip,
}: {
  step: TourStep
  index: number
  total: number
  isFirst: boolean
  isLast: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}) {
  const rect = useAnchorRect(step.target, true)
  const box = rect ? cutoutBox(rect, step.spotlightPadding ?? 8) : null
  const anchor = box ? virtualAnchor(box) : null

  const dimZ = 2000

  const card = (
    <SpotlightCard
      step={step}
      index={index}
      total={total}
      isFirst={isFirst}
      isLast={isLast}
      onNext={onNext}
      onPrev={onPrev}
      onSkip={onSkip}
    />
  )

  return createPortal(
    <>
      {box ? (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            borderRadius: 1.5,
            border: '2px solid',
            borderColor: 'primary.main',
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.55)',
            pointerEvents: 'none',
            zIndex: dimZ,
            transition: 'top 150ms, left 150ms, width 150ms, height 150ms',
          }}
        />
      ) : (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(15,23,42,0.55)',
            pointerEvents: 'none',
            zIndex: dimZ,
          }}
        />
      )}

      {anchor ? (
        <Popper
          open
          anchorEl={anchor}
          placement={step.placement && step.placement !== 'auto' ? step.placement : 'bottom'}
          sx={{ zIndex: dimZ + 1 }}
          modifiers={[
            { name: 'offset', options: { offset: [0, 12] } },
            { name: 'preventOverflow', options: { padding: 12 } },
            { name: 'flip', options: { padding: 12 } },
          ]}
        >
          {card}
        </Popper>
      ) : (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: dimZ + 1,
          }}
        >
          {card}
        </Box>
      )}
    </>,
    document.body,
  )
}
