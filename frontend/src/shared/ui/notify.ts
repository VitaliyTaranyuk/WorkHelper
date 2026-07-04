import { toast, type ExternalToast } from 'sonner'

/**
 * Единый сервис всплывающих уведомлений (ТП-71).
 *
 * Все toast-уведомления приложения проходят через этот модуль — внешний вид
 * и поведение задаются в одном месте (плюс глобальная тема Toaster в
 * main.tsx: нейтральные тосты в стиле WorkTask вместо стандартных цветов
 * библиотеки, паттерн Linear).
 *
 * Правила использования (аудит ТП-71):
 * - success — только для значимых действий, результат которых НЕ виден
 *   сразу на экране (создание задачи/спринта, сохранение, приглашение);
 * - error — для всех ошибок (сеть, сохранение, доступ);
 * - НЕ показывать тосты для действий с мгновенно видимым результатом
 *   (добавление/удаление вложения, связи, перенос в списке).
 */
export const notify = {
  success: (message: string, options?: ExternalToast) =>
    toast.success(message, options),
  error: (message: string, options?: ExternalToast) =>
    toast.error(message, options),
  info: (message: string, options?: ExternalToast) => toast.info(message, options),
  warning: (message: string, options?: ExternalToast) =>
    toast.warning(message, options),
}
