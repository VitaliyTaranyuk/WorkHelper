/**
 * G-6: куда вести из уведомления о задаче.
 *
 * `Notification` хранит `project_id` и до сих пор использовал его только для
 * встреч; задача открывалась по одному коду, то есть в ТЕКУЩЕМ проекте. Для
 * уведомления из другого проекта это давало 404 — или чужую задачу, если
 * префиксы кодов совпали (`Project.code` не уникален, T-310).
 *
 * Хуже загрузки — редактирование: карточка берёт статусы, участников и
 * завершающую колонку из активного проекта (`TaskCardContent` →
 * `useProjectData`). Открытая поверх текущего проекта задача чужого предлагала
 * бы колонки не своего проекта и сохраняла бы в них.
 *
 * Поэтому решение зависит от проекта, а не только от кода:
 *  - задача своего (или неизвестного) проекта — модалка поверх интерфейса, как
 *    и было с ТП-89: пользователь возвращается к списку уведомлений;
 *  - задача чужого проекта — переход на канонический адрес `/project/{id}/task/{code}`
 *    (G-4), где проект объявляет маршрут и весь экран согласован.
 *
 * Логика вынесена из `NotificationBell` отдельной чистой функцией — тем же
 * приёмом, что `buildVoiceContext`: развилку нужно проверять тестом, а не
 * рендером колокольчика со всеми его запросами.
 */
export type NotificationTaskTarget =
  | { kind: 'modal'; taskCode: string }
  | { kind: 'navigate'; taskCode: string; projectId: string }

export function resolveNotificationTaskTarget({
  taskCode,
  notificationProjectId,
  currentProjectId,
}: {
  taskCode: string
  notificationProjectId?: string | null
  currentProjectId?: string | null
}): NotificationTaskTarget {
  // Проект уведомления неизвестен (старые записи) или совпадает с открытым —
  // прежнее поведение. Никакой догадки: без projectId уйти «в правильный»
  // проект всё равно нельзя, а переход ради перехода отобрал бы у пользователя
  // список уведомлений.
  if (!notificationProjectId || notificationProjectId === currentProjectId) {
    return { kind: 'modal', taskCode }
  }
  return { kind: 'navigate', taskCode, projectId: notificationProjectId }
}
