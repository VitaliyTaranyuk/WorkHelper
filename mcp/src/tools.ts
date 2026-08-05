import type { ProjectSummary, WorkTaskClient } from './client.js'

/**
 * T-517 (ADR-024): что MCP-сервер WorkTask умеет.
 *
 * <b>Правил здесь нет и не будет.</b> После ADR-017 и ADR-023 правила доезжают до агента
 * файлами репозитория (`AGENTS.md`, `.ai/PROJECT_RULES.md`) и работают без сети; отдавать
 * их ещё и по MCP значило бы завести второй источник того же содержания — ровно ту ошибку,
 * которую сняли T-107 и ADR-023. Контракт сервера сужен до того, чего в файлах нет и быть
 * не может: **задача, её контекст и отметка о прохождении процесса**.
 *
 * Инструменты — чистые функции над клиентом: так они проверяются тестом без сети и без
 * поднятого MCP-транспорта.
 */

export const RULES_ARE_NOT_SERVED_HERE =
  'Правила проекта этот сервер не отдаёт: они лежат в репозитории (AGENTS.md) и работают ' +
  'без подключения к WorkTask. Здесь — задачи и отметки о прохождении процесса.'

export type TaskProcessStep = {
  id: string
  code: string
  name: string
  position: number
  required: boolean
  current: boolean
}

export type TaskProcess = {
  taskId: string
  size: string | null
  currentStepId: string | null
  steps: TaskProcessStep[]
}

export async function listProjects(client: WorkTaskClient): Promise<ProjectSummary[]> {
  return client.request<ProjectSummary[]>('GET', '/projects/for-user')
}

/**
 * Задача по коду вместе с её процессом. Один вызов вместо двух не ради экономии запросов,
 * а потому что агенту нужен именно контекст: «что делать» и «на каком этапе» — это один
 * вопрос, разбитый на два ответа только внутри API.
 */
export async function getTask(
  client: WorkTaskClient,
  projectId: string,
  code: string,
): Promise<{ task: Record<string, unknown>; process: TaskProcess | null }> {
  const task = await client.request<Record<string, unknown>>(
    'GET',
    `/tasks/${projectId}/code/${encodeURIComponent(code)}`,
  )

  const taskId = typeof task?.id === 'string' ? task.id : null
  if (!taskId) return { task, process: null }

  // Процесс необязателен (I-03): проект может его не завести, и это не ошибка —
  // задача возвращается без него, а не вместе с отказом.
  const process = await client
    .request<TaskProcess>('GET', `/task-process/project/${projectId}/${taskId}`)
    .catch(() => null)

  return { task, process }
}

export async function listSprintTasks(
  client: WorkTaskClient,
  projectId: string,
): Promise<unknown> {
  return client.request('GET', `/sprints/project/${projectId}/sprint-list`)
}

export async function updateTaskStatus(
  client: WorkTaskClient,
  projectId: string,
  taskId: string,
  statusId: number,
): Promise<unknown> {
  return client.request('POST', '/tasks/update-status', {
    projectId,
    id: taskId,
    status: statusId,
  })
}

/**
 * Отметка о прохождении этапа — та самая телеметрия, ради которой MCP и нужен
 * (ADR-024): платформа узнаёт, где идёт работа, а агент не хранит это у себя.
 */
export async function setProcessStep(
  client: WorkTaskClient,
  projectId: string,
  taskId: string,
  stepId: string | null,
): Promise<TaskProcess> {
  return client.request<TaskProcess>(
    'PUT',
    `/task-process/project/${projectId}/${taskId}/step`,
    { stepId },
  )
}

export async function setTaskSize(
  client: WorkTaskClient,
  projectId: string,
  taskId: string,
  size: string | null,
): Promise<TaskProcess> {
  return client.request<TaskProcess>(
    'PUT',
    `/task-process/project/${projectId}/${taskId}/size`,
    { size },
  )
}
