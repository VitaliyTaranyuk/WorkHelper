import {
  resolveMember,
  resolvePriority,
  resolveSprint,
  resolveStatus,
} from '../../resolve/entityResolver'
import { taskAttributeCommand } from './taskAttributeCommand'

/**
 * Команды смены атрибутов задачи (ТП-98 / C2). Триггеры включают слова ЗНАЧЕНИЯ,
 * чтобы команды не перехватывали друг друга («переведи в готово» → статус,
 * «перенеси в бэклог» → спринт).
 */

export const statusCommand = taskAttributeCommand({
  id: 'task.status',
  title: 'Сменить статус',
  description: 'Меняет статус (колонку доски) задачи',
  examples: ['Переведи эту задачу в готово', 'Статус ТП-90 в работе'],
  // (^|\s) перед значимыми словами: иначе «готов» ловит «подГОТОВить» и т.п.
  trigger: /(^|\s)(статус|в\s*работ|готов|выполн|сделан|ревью|на\s*проверк|отмен)/iu,
  resolveValue: resolveStatus,
  valueLabel: (s) => `«${s.label}»`,
  valueClarify: 'Не понял, в какой статус перевести.',
  apply: async (task, status, ctx) => {
    await ctx.setStatus(task.id, status.id)
    return { message: `${task.code}: статус «${status.label}»`, taskCode: task.code }
  },
})

export const sprintCommand = taskAttributeCommand({
  id: 'task.sprint',
  title: 'Перенести в спринт',
  description: 'Переносит задачу в спринт (или в бэклог)',
  examples: ['Перенеси эту задачу в текущий спринт', 'ТП-90 в бэклог'],
  trigger: /(спринт|бэклог|беклог)/iu,
  resolveValue: resolveSprint,
  valueLabel: (s) => `«${s.name || 'спринт'}»`,
  valueClarify: 'Не понял, в какой спринт перенести.',
  apply: async (task, sprint, ctx) => {
    await ctx.setSprint(task.id, sprint.id)
    return {
      message: `${task.code}: перенесено в «${sprint.name || 'спринт'}»`,
      taskCode: task.code,
    }
  },
})

export const priorityCommand = taskAttributeCommand({
  id: 'task.priority',
  title: 'Сменить приоритет',
  description: 'Меняет приоритет задачи',
  examples: ['Сделай эту задачу высоким приоритетом', 'Приоритет ТП-90 низкий'],
  trigger: /(приоритет|срочн|критичн)/iu,
  resolveValue: resolvePriority,
  valueLabel: (p) => `«${p.label}»`,
  valueClarify: 'Не понял, какой приоритет поставить.',
  apply: async (task, priority, ctx) => {
    await ctx.patchTask(task.code, { priority: priority.value })
    return {
      message: `${task.code}: приоритет «${priority.label}»`,
      taskCode: task.code,
    }
  },
})

export const assigneeCommand = taskAttributeCommand({
  id: 'task.assignee',
  title: 'Сменить исполнителя',
  description: 'Назначает исполнителя задачи',
  examples: ['Назначь эту задачу на Иванова', 'Исполнитель ТП-90 Петров'],
  trigger: /(исполнит|назнач|поручи|ответственн)/iu,
  resolveValue: resolveMember,
  valueLabel: (m) => m.name,
  valueClarify: 'Не понял, на кого назначить.',
  apply: async (task, member, ctx) => {
    await ctx.patchTask(task.code, { assignee: member.id })
    return {
      message: `${task.code}: исполнитель ${member.name}`,
      taskCode: task.code,
    }
  },
})
