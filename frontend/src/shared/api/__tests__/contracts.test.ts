import { describe, expect, it, vi } from 'vitest'
import {
  ApiContractError,
  meetRoomSchema,
  parseContract,
  sprintListSchema,
  taskDataSchema,
} from '../contracts'

/**
 * ТП-176 (T6 из ТП-172): контрактные тесты фиксируют форму ответов API.
 * Фикстуры повторяют реальные ответы backend — если DTO меняется на
 * бэкенде, тест краснеет и дрейф контракта ловится в CI, а не у
 * пользователя белым экраном.
 */

const taskFixture = {
  id: '89b28aa1-266e-4444-9478-26caf3a1ed84',
  title: 'Создание задачи',
  description: 'Описание',
  priority: 'MEDIUM',
  assignee: null,
  creator: { id: 'u1', email: 't@t.t', firstName: 'И', lastName: 'И' },
  projectId: '17565a09-5b2d-4edd-acf0-d69b3ce57b9d',
  sprintId: '24265a09-5b2d-4edd-acf0-d69b3ce57b9d',
  taskType: 'TASK',
  status: { id: 1, code: 'To Do', description: 'To Do' },
  estimation: 1,
  code: 'ТП-1',
  position: 0,
  createdAt: '2026-07-07T07:14:32',
  updatedAt: '2026-07-07T07:14:32',
  archived: false,
  completedDate: null,
  awaitingReply: false,
}

describe('taskDataSchema (task-by-code)', () => {
  it('принимает реальную форму ответа', () => {
    expect(() =>
      parseContract(taskDataSchema, taskFixture, 'task-by-code'),
    ).not.toThrow()
  })

  it('списковая форма без описания (ТП-187) валидна', () => {
    expect(() =>
      parseContract(
        taskDataSchema,
        { ...taskFixture, description: null },
        'task-by-code',
      ),
    ).not.toThrow()
  })

  it('аддитивные поля бэкенда не считаются ошибкой', () => {
    expect(() =>
      parseContract(
        taskDataSchema,
        { ...taskFixture, newBackendField: 42 },
        'task-by-code',
      ),
    ).not.toThrow()
  })

  it('дрейф контракта ловится: статус без id — ошибка с внятным сообщением', () => {
    expect(() =>
      parseContract(
        taskDataSchema,
        { ...taskFixture, status: { code: 'To Do' } },
        'task-by-code',
      ),
    ).toThrow(ApiContractError)
  })
})

describe('sprintListSchema (sprint-list)', () => {
  const sprintsFixture = {
    sprints: [
      {
        id: '24265a09',
        name: null,
        goal: null,
        startDate: '2026-06-23',
        endDate: '2033-06-23',
        active: true,
        paused: false,
        defaultSprint: false,
        status: 'ACTIVE',
        tasks: [taskFixture],
      },
    ],
  }

  it('принимает реальную форму ответа', () => {
    expect(() =>
      parseContract(sprintListSchema, sprintsFixture, 'sprint-list'),
    ).not.toThrow()
  })

  it('tasks: не-массив — ошибка контракта, а не краш рендера', () => {
    const broken = {
      sprints: [{ ...sprintsFixture.sprints[0], tasks: 'oops' }],
    }
    expect(() =>
      parseContract(sprintListSchema, broken, 'sprint-list'),
    ).toThrow(ApiContractError)
  })
})

describe('meetRoomSchema (meet-room)', () => {
  const roomFixture = {
    token: 'AbC123',
    title: 'Планёрка',
    projectId: 'p1',
    projectName: 'WorkTask',
    meetingId: null,
    taskId: null,
    taskCode: null,
    createdByName: 'Иван Иванов',
    maxParticipants: 8,
  }

  it('принимает реальную форму ответа', () => {
    expect(() =>
      parseContract(meetRoomSchema, roomFixture, 'meet-room'),
    ).not.toThrow()
  })

  it('пустой token — ошибка контракта (вход в звонок невозможен)', () => {
    expect(() =>
      parseContract(meetRoomSchema, { ...roomFixture, token: '' }, 'meet-room'),
    ).toThrow(ApiContractError)
  })
})

describe('parseContract', () => {
  it('сообщение ошибки называет контракт и поле', () => {
    try {
      parseContract(meetRoomSchema, {}, 'meet-room')
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(ApiContractError)
      expect((e as Error).message).toContain('meet-room')
      expect((e as Error).message).toContain('token')
    }
  })

  it('дрейф уходит в мониторинг (связка с ТП-175)', async () => {
    const monitoring = await import('@/shared/monitoring/init')
    const spy = vi.spyOn(monitoring, 'captureMonitoredError')
    expect(() => parseContract(meetRoomSchema, {}, 'meet-room')).toThrow()
    expect(spy).toHaveBeenCalledWith(
      expect.any(ApiContractError),
      expect.objectContaining({ area: 'контракт API: meet-room' }),
    )
    spy.mockRestore()
  })
})
