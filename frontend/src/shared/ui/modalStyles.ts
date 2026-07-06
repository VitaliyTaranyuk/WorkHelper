import { type SxProps } from '@mui/material'

const modalContainer: SxProps = {
  maxWidth: '631px',
  borderRadius: '20px',
  padding: '28px 32px',
  border: 'none',
  borderColor: 'primary.light',
  // ТП-64: модалка тянет цвет из токена темы (светлая/тёмная)
  backgroundColor: 'var(--wt-surface)',
  boxShadow: 'var(--wt-shadow-modal)',
  overflow: 'hidden',
}

/**
 * Контент модалки с полями ввода (ТП-62): floating label MUI (outlined)
 * выступает над рамкой поля на ~половину своей высоты — при нулевом верхнем
 * паддинге DialogContent (скролл-область) верх label обрезается. Верхний
 * паддинг оставляет место для label; официальный механизм анимации/notch
 * MUI не переопределяется.
 */
const modalContent: SxProps = {
  padding: '10px 0 0',
  marginTop: '8px',
}

export const modalStyle = {
  modalContainer,
  modalContent,
}
