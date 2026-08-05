import { describe, expect, it, vi } from 'vitest'
import { WorkTaskClient, WorkTaskError, configFromEnv } from '../client.js'
import {
  RULES_ARE_NOT_SERVED_HERE,
  getTask,
  listProjects,
  setProcessStep,
  updateTaskStatus,
} from '../tools.js'

/**
 * T-517: MCP-сервер WorkTask.
 *
 * Проверяется не «SDK запускается», а свойства контракта: сервер ходит по тем путям,
 * которые действительно существуют на бэкенде (**W-01**); повторный вход по 401 случается
 * ровно один раз, а не бесконечно; отсутствующий процесс не превращается в отказ (I-03);
 * без учётных данных сервер останавливается на старте, а не работает молча (**W-06**);
 * правил среди инструментов нет (**ADR-024**).
 */

type FetchCall = { url: string; init?: RequestInit }

function fakeFetch(handlers: Array<(call: FetchCall) => Response | null>) {
  const calls: FetchCall[] = []
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init }
    calls.push(call)
    for (const handler of handlers) {
      const response = handler(call)
      if (response) return response
    }
    return new Response('', { status: 404 })
  })
  return { impl: impl as unknown as typeof fetch, calls }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const loginHandler = (call: FetchCall) =>
  call.url.endsWith('/auth/login')
    ? json({ accessToken: 'token-1', refreshToken: 'r' })
    : null

const config = {
  baseUrl: 'https://worktask.test/work-task/api/v1',
  email: 'user@test',
  password: 'secret',
}

describe('клиент WorkTask (T-517)', () => {
  it('входит один раз и переиспользует токен', async () => {
    const { impl, calls } = fakeFetch([
      loginHandler,
      (call) => (call.url.endsWith('/projects/for-user') ? json([]) : null),
    ])
    const client = new WorkTaskClient(config, impl)

    await listProjects(client)
    await listProjects(client)

    expect(calls.filter((c) => c.url.endsWith('/auth/login'))).toHaveLength(1)
    expect(calls[1].init?.headers).toMatchObject({ Authorization: 'Bearer token-1' })
  })

  /**
   * Протухший токен обновляется, но ровно один раз: бесконечный цикл перелогинов на
   * неверных учётных данных выглядел бы как зависание, а не как отказ (**W-06**).
   */
  it('повторяет запрос после 401 ровно один раз', async () => {
    let attempts = 0
    const { impl, calls } = fakeFetch([
      loginHandler,
      (call) => {
        if (!call.url.endsWith('/projects/for-user')) return null
        attempts += 1
        return json([], 401)
      },
    ])
    const client = new WorkTaskClient(config, impl)

    await expect(listProjects(client)).rejects.toBeInstanceOf(WorkTaskError)
    expect(attempts).toBe(2)
    expect(calls.filter((c) => c.url.endsWith('/auth/login'))).toHaveLength(2)
  })

  it('неудачный вход объясняет, что проверить', async () => {
    const { impl } = fakeFetch([
      (call) => (call.url.endsWith('/auth/login') ? json({}, 401) : null),
    ])
    const client = new WorkTaskClient(config, impl)

    await expect(listProjects(client)).rejects.toThrow(/WORKTASK_EMAIL/)
  })

  /** W-06: сервер без адреса и учётных данных не имеет права выглядеть рабочим. */
  it('без переменных окружения конфигурация не собирается', () => {
    expect(() => configFromEnv({} as NodeJS.ProcessEnv)).toThrow(/WORKTASK_BASE_URL/)
    expect(() =>
      configFromEnv({ WORKTASK_BASE_URL: 'https://x' } as NodeJS.ProcessEnv),
    ).toThrow(/WORKTASK_EMAIL/)
  })

  it('хвостовой слеш в адресе не удваивается в путях', () => {
    const parsed = configFromEnv({
      WORKTASK_BASE_URL: 'https://worktask.test/work-task/api/v1/',
      WORKTASK_EMAIL: 'user@test',
      WORKTASK_PASSWORD: 'secret',
    } as NodeJS.ProcessEnv)

    expect(parsed.baseUrl).toBe('https://worktask.test/work-task/api/v1')
  })
})

describe('инструменты MCP (T-517)', () => {
  /** W-01: путь и метод обязаны совпадать с существующим эндпоинтом бэкенда. */
  it('задача запрашивается по коду в пределах проекта', async () => {
    const { impl, calls } = fakeFetch([
      loginHandler,
      (call) =>
        call.url.includes('/tasks/p1/code/') ? json({ id: 't1', code: 'ТП-42' }) : null,
      (call) =>
        call.url.includes('/task-process/project/p1/t1')
          ? json({ taskId: 't1', size: 'S', currentStepId: null, steps: [] })
          : null,
    ])
    const client = new WorkTaskClient(config, impl)

    const result = await getTask(client, 'p1', 'ТП-42')

    expect(result.task).toMatchObject({ code: 'ТП-42' })
    expect(result.process).toMatchObject({ size: 'S' })
    expect(calls.some((c) => c.url.includes(encodeURIComponent('ТП-42')))).toBe(true)
  })

  /** I-03: у проекта может не быть процесса — это не ошибка, а нормальное состояние. */
  it('отсутствующий процесс не превращает задачу в отказ', async () => {
    const { impl } = fakeFetch([
      loginHandler,
      (call) => (call.url.includes('/tasks/p1/code/') ? json({ id: 't1' }) : null),
      (call) => (call.url.includes('/task-process/') ? json({}, 500) : null),
    ])
    const client = new WorkTaskClient(config, impl)

    const result = await getTask(client, 'p1', 'ТП-1')

    expect(result.task).toMatchObject({ id: 't1' })
    expect(result.process).toBeNull()
  })

  it('статус отправляется телом, которое ждёт бэкенд', async () => {
    const { impl, calls } = fakeFetch([
      loginHandler,
      (call) => (call.url.endsWith('/tasks/update-status') ? json({}) : null),
    ])
    const client = new WorkTaskClient(config, impl)

    await updateTaskStatus(client, 'p1', 't1', 7)

    const call = calls.find((c) => c.url.endsWith('/tasks/update-status'))
    expect(call?.init?.method).toBe('POST')
    expect(JSON.parse(String(call?.init?.body))).toEqual({
      projectId: 'p1',
      id: 't1',
      status: 7,
    })
  })

  it('снятие этапа отправляет null, а не пропускает поле', async () => {
    const { impl, calls } = fakeFetch([
      loginHandler,
      (call) =>
        call.url.includes('/task-process/project/p1/t1/step')
          ? json({ taskId: 't1', size: null, currentStepId: null, steps: [] })
          : null,
    ])
    const client = new WorkTaskClient(config, impl)

    await setProcessStep(client, 'p1', 't1', null)

    const call = calls.find((c) => c.url.includes('/step'))
    expect(call?.init?.method).toBe('PUT')
    expect(JSON.parse(String(call?.init?.body))).toEqual({ stepId: null })
  })

  /**
   * ADR-024: правила доезжают до агента файлами репозитория и работают без сети.
   * Инструмента «дай правила» здесь нет намеренно — и сервер говорит об этом прямо,
   * чтобы агент не искал его и не додумывал.
   */
  it('сервер прямо сообщает, что правил не отдаёт', () => {
    expect(RULES_ARE_NOT_SERVED_HERE).toMatch(/AGENTS\.md/)
    expect(RULES_ARE_NOT_SERVED_HERE).toMatch(/не отдаёт/)
  })
})
