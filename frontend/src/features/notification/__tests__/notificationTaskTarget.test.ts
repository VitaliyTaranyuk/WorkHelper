import { describe, expect, it } from 'vitest'
import { resolveNotificationTaskTarget } from '../notificationTaskTarget'

/**
 * G-6: уведомление хранило `projectId` и использовало его только для встреч.
 * Задача открывалась по одному коду — то есть в текущем проекте.
 */
describe('куда ведёт уведомление о задаче (G-6)', () => {
  it('задача чужого проекта открывается по адресу этого проекта, а не модалкой', () => {
    expect(
      resolveNotificationTaskTarget({
        taskCode: 'ТП-236',
        notificationProjectId: 'project-b',
        currentProjectId: 'project-a',
      }),
    ).toEqual({ kind: 'navigate', taskCode: 'ТП-236', projectId: 'project-b' })
  })

  it('задача своего проекта по-прежнему открывается модалкой (ТП-89)', () => {
    expect(
      resolveNotificationTaskTarget({
        taskCode: 'ТП-236',
        notificationProjectId: 'project-a',
        currentProjectId: 'project-a',
      }),
    ).toEqual({ kind: 'modal', taskCode: 'ТП-236' })
  })

  // Старые уведомления могли быть записаны без проекта. Догадываться нельзя:
  // без projectId уйти «в правильный» проект всё равно некуда, а переход ради
  // перехода отобрал бы у пользователя список уведомлений.
  it('уведомление без проекта не превращается в переход', () => {
    expect(
      resolveNotificationTaskTarget({
        taskCode: 'ТП-236',
        notificationProjectId: null,
        currentProjectId: 'project-a',
      }),
    ).toEqual({ kind: 'modal', taskCode: 'ТП-236' })
  })

  // Проект ещё не определён (первый кадр после входа): сравнивать не с чем,
  // но проект задачи известен — открываем именно его, иначе карточка снова
  // угадывала бы проект.
  it('без известного текущего проекта ведёт в проект уведомления', () => {
    expect(
      resolveNotificationTaskTarget({
        taskCode: 'ТП-236',
        notificationProjectId: 'project-b',
        currentProjectId: undefined,
      }),
    ).toEqual({ kind: 'navigate', taskCode: 'ТП-236', projectId: 'project-b' })
  })
})
