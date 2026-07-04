import type { VoiceContext } from '../types'

/** Базовый снимок контекста для тестов командного режима (ТП-91). */
export function makeContext(over: Partial<VoiceContext> = {}): VoiceContext {
  return {
    projectId: 'p1',
    activeSprintId: 's-active',
    defaultSprintId: 's-backlog',
    currentUserId: 'u1',
    openTask: undefined,
    lookup: {
      members: [
        { id: 'u1', name: 'Иван Иванов', username: 'ivanov' },
        { id: 'u2', name: 'Пётр Петров', username: 'petrov' },
      ],
      statuses: [
        { id: 1, code: 'To Do', label: 'To Do' },
        { id: 2, code: 'In Progress', label: 'In Progress' },
        { id: 4, code: 'Done', label: 'Done' },
      ],
      sprints: [
        { id: 's-backlog', name: 'Backlog', active: false, isDefault: true },
        { id: 's-active', name: 'Спринт 1', active: true, isDefault: false },
      ],
      priorities: [
        { value: 'LOW', label: 'Низкий' },
        { value: 'MEDIUM', label: 'Средний' },
        { value: 'HIGH', label: 'Высокий' },
      ],
    },
    ...over,
  }
}
