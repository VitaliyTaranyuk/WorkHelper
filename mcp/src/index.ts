#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { WorkTaskClient, configFromEnv } from './client.js'
import {
  RULES_ARE_NOT_SERVED_HERE,
  getTask,
  listProjects,
  listSprintTasks,
  setProcessStep,
  setTaskSize,
  updateTaskStatus,
} from './tools.js'

/**
 * T-517: MCP-сервер WorkTask (ADR-024).
 *
 * Транспорт — stdio: сервер запускается рядом с агентом и ходит в WorkTask по HTTP.
 * Так работает с любым MCP-совместимым агентом, а учётные данные не покидают машину
 * пользователя.
 *
 * Инструменты — тонкие обёртки над чистыми функциями из `tools.ts`: вся логика проверяется
 * тестом без сети и без поднятого транспорта.
 */

const server = new McpServer(
  { name: 'worktask', version: '0.1.0' },
  {
    instructions:
      'Инструменты WorkTask: проекты, задачи, статусы и отметки о прохождении этапов ' +
      'процесса. ' +
      RULES_ARE_NOT_SERVED_HERE,
  },
)

const client = new WorkTaskClient(configFromEnv())

/** Единый вид ответа: текст JSON. Ошибка возвращается как ошибка инструмента (**K-34**). */
async function reply(run: () => Promise<unknown>) {
  const result = await run()
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  }
}

server.registerTool(
  'worktask_list_projects',
  {
    title: 'Проекты пользователя',
    description: 'Список проектов, доступных пользователю WorkTask.',
    inputSchema: {},
  },
  async () => reply(() => listProjects(client)),
)

server.registerTool(
  'worktask_get_task',
  {
    title: 'Задача по коду',
    description:
      'Задача по её коду вместе с процессом: размер, текущий этап и этапы, обязательные ' +
      'для этого размера. Процесс может отсутствовать — это нормальное состояние проекта.',
    inputSchema: {
      projectId: z.string().describe('ИД проекта'),
      code: z.string().describe('Код задачи, например ТП-42'),
    },
  },
  async ({ projectId, code }) => reply(() => getTask(client, projectId, code)),
)

server.registerTool(
  'worktask_list_sprint_tasks',
  {
    title: 'Задачи спринтов проекта',
    description: 'Спринты проекта с задачами: активный спринт, бэклог и завершённые.',
    inputSchema: { projectId: z.string().describe('ИД проекта') },
  },
  async ({ projectId }) => reply(() => listSprintTasks(client, projectId)),
)

server.registerTool(
  'worktask_update_task_status',
  {
    title: 'Изменить статус задачи',
    description: 'Перевести задачу в колонку доски по её ИД статуса.',
    inputSchema: {
      projectId: z.string().describe('ИД проекта'),
      taskId: z.string().describe('ИД задачи'),
      statusId: z.number().describe('ИД статуса (колонки доски)'),
    },
  },
  async ({ projectId, taskId, statusId }) =>
    reply(() => updateTaskStatus(client, projectId, taskId, statusId)),
)

server.registerTool(
  'worktask_set_process_step',
  {
    title: 'Отметить этап процесса',
    description:
      'Отметить, на каком этапе процесса находится задача. Пустой stepId снимает этап.',
    inputSchema: {
      projectId: z.string().describe('ИД проекта'),
      taskId: z.string().describe('ИД задачи'),
      stepId: z.string().nullable().describe('ИД этапа; null — снять этап'),
    },
  },
  async ({ projectId, taskId, stepId }) =>
    reply(() => setProcessStep(client, projectId, taskId, stepId)),
)

server.registerTool(
  'worktask_set_task_size',
  {
    title: 'Задать размер задачи',
    description:
      'Размер задачи XS/S/M/L — насколько глубоко идёт разбор. Понижение размера ' +
      'фиксируется в истории задачи. Пустой size снимает размер.',
    inputSchema: {
      projectId: z.string().describe('ИД проекта'),
      taskId: z.string().describe('ИД задачи'),
      size: z.enum(['XS', 'S', 'M', 'L']).nullable().describe('Размер; null — снять'),
    },
  },
  async ({ projectId, taskId, size }) =>
    reply(() => setTaskSize(client, projectId, taskId, size)),
)

await server.connect(new StdioServerTransport())
