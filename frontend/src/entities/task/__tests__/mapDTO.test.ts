import { describe, expect, it, vi } from 'vitest'

const captureMonitoredError = vi.fn()
vi.mock('@/shared/monitoring/init', () => ({
  captureMonitoredError: (...args: unknown[]) => captureMonitoredError(...args),
}))

import { mapTaskMinDTOToTaskCard } from '../mapDTO'
import { TASK_PRIORITY_TUPPLE, TASK_TYPE_TUPPLE } from '../types'
import type { TaskDataDto } from '@/data-contracts'

/**
 * Инвариант границы данных (инцидент 2026-07-28): маппер задачи НИКОГДА не
 * бросает исключение на значении перечисления. Незнакомое значение — это
 * аддитивное изменение бэкенда, а не повод обнулить экран: раньше такой
 * throw ронял весь запрос списка спринтов и «Список задач» оставался с одной
 * секцией «Завершённые».
 */

function dto(over: Partial<TaskDataDto>): TaskDataDto {
  return {
    id: 't-1',
    title: 'Задача',
    priority: 'MEDIUM',
    taskType: 'TASK',
    projectId: 'p-1',
    sprintId: 's-1',
    code: 'ТП-1',
    status: { id: 1, code: 'To Do' },
    creator: { id: 'u-1', firstName: 'Иван', lastName: 'Иванов' },
    createdAt: '2026-07-27T22:19:18',
    ...over,
  } as TaskDataDto
}

describe('mapTaskMinDTOToTaskCard: перечисления бэкенда', () => {
  it.each(TASK_TYPE_TUPPLE)('тип %s переносится как есть', (taskType) => {
    expect(mapTaskMinDTOToTaskCard(dto({ taskType })).taskType).toBe(taskType)
  })

  it.each(TASK_PRIORITY_TUPPLE)(
    'приоритет %s переносится как есть',
    (priority) => {
      expect(mapTaskMinDTOToTaskCard(dto({ priority })).priority).toBe(priority)
    },
  )

  it('неизвестный тип не роняет маппинг: фолбэк TASK + сигнал в мониторинг', () => {
    captureMonitoredError.mockClear()

    const card = mapTaskMinDTOToTaskCard(dto({ taskType: 'EPIC_FROM_FUTURE' }))

    expect(card.taskType).toBe('TASK')
    expect(card.title).toBe('Задача')
    expect(captureMonitoredError).toHaveBeenCalledTimes(1)
  })

  it('неизвестный приоритет не роняет маппинг: фолбэк MEDIUM', () => {
    expect(mapTaskMinDTOToTaskCard(dto({ priority: 'TRIVIAL' })).priority).toBe(
      'MEDIUM',
    )
  })

  it('пустые значения не роняют маппинг', () => {
    const card = mapTaskMinDTOToTaskCard(
      dto({ taskType: undefined, priority: undefined }),
    )
    expect(card.taskType).toBe('TASK')
    expect(card.priority).toBe('MEDIUM')
  })

  it('одно и то же неизвестное значение сообщается один раз (без флуда)', () => {
    captureMonitoredError.mockClear()

    mapTaskMinDTOToTaskCard(dto({ taskType: 'SPIKE' }))
    mapTaskMinDTOToTaskCard(dto({ taskType: 'SPIKE' }))
    mapTaskMinDTOToTaskCard(dto({ taskType: 'SPIKE' }))

    expect(captureMonitoredError).toHaveBeenCalledTimes(1)
  })
})
