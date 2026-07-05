import { vi } from 'vitest'
import type { VoiceCommandContext, VoiceContext } from '../types'

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

/**
 * Полный контекст исполнения (данные + сервисы-моки) для тестов команд.
 * Все сервисы — vi.fn: тест проверяет вызовы; при росте VoiceServices ломается
 * ОДНО место, а не каждый тест.
 */
export function stubServices() {
  return {
    createTask: vi.fn(async () => ({ id: 'x', code: 'ТП-0', title: 't' })),
    navigate: vi.fn(),
    setStatus: vi.fn(async () => {}),
    setSprint: vi.fn(async () => {}),
    patchTask: vi.fn(async (code: string) => ({ id: 'x', code, title: 't' })),
    findTask: vi.fn(async (code: string) => ({
      id: `id-${code}`,
      code,
      title: 't',
      statusId: 1,
      sprintId: 's-backlog',
    })),
    addComment: vi.fn(async () => {}),
    createSprint: vi.fn(async () => {}),
    activateSprint: vi.fn(async () => {}),
    finishSprint: vi.fn(async () => {}),
    markNotificationsRead: vi.fn(async () => {}),
    createMeeting:
      vi.fn<
        (input: { title: string; startAt: string; endAt?: string }) => Promise<void>
      >(async () => {}),
  }
}

export function makeCommandContext(over: Partial<VoiceContext> = {}) {
  const services = stubServices()
  const ctx: VoiceCommandContext = { ...makeContext(over), ...services }
  return { ctx, ...services }
}
