/**
 * Палитра «сцены» звонка. Видеополотно — тёмное в обеих темах приложения
 * (канон Meet/Zoom/Teams: видео смотрится на тёмном, белая сцена слепит).
 * Панели (участники/чат) и контролы используют обычные токены --wt-*.
 */
export const stage = {
  bg: '#101216',
  tile: '#1c1f26',
  tileBorder: 'rgba(255, 255, 255, 0.08)',
  text: '#f2f3f5',
  textMuted: 'rgba(242, 243, 245, 0.65)',
  badgeBg: 'rgba(16, 18, 22, 0.72)',
  speakingRing: '#22c55e',
  controlBg: 'rgba(255, 255, 255, 0.1)',
  controlHover: 'rgba(255, 255, 255, 0.18)',
  controlActiveOff: '#ea4335',
} as const
