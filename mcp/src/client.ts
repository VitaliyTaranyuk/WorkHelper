/**
 * T-517: HTTP-клиент WorkTask для MCP-сервера.
 *
 * Учётные данные приходят **только из окружения** (**K-33**): агент их не запрашивает и
 * не хранит. Токен живёт в памяти процесса и обновляется по 401 — повторный вход дешевле,
 * чем гадать о сроке жизни JWT.
 */

export type WorkTaskConfig = {
  baseUrl: string
  email: string
  password: string
}

export type ProjectSummary = { id: string; name: string }

export type TaskSummary = {
  id: string
  code: string
  title: string
  status?: string
  assignee?: string
}

export type Json = Record<string, unknown>

/** Ошибка обращения к WorkTask: наружу уходит понятное сообщение (**K-34**). */
export class WorkTaskError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'WorkTaskError'
    this.status = status
  }
}

type FetchLike = typeof fetch

export class WorkTaskClient {
  private readonly config: WorkTaskConfig
  private readonly fetchImpl: FetchLike
  private accessToken: string | null = null

  constructor(config: WorkTaskConfig, fetchImpl: FetchLike = fetch) {
    this.config = config
    this.fetchImpl = fetchImpl
  }

  /**
   * Запрос с автоматическим входом. При 401 токен сбрасывается и запрос повторяется
   * **один** раз: бесконечный цикл перелогинов на неверных учётных данных был бы
   * молчаливым отказом (**W-06**).
   */
  async request<T>(method: string, path: string, body?: Json): Promise<T> {
    const send = async () => {
      const token = await this.token()
      return this.fetchImpl(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    }

    let response = await send()
    if (response.status === 401) {
      this.accessToken = null
      response = await send()
    }

    if (!response.ok) {
      throw new WorkTaskError(
        response.status,
        `WorkTask ответил ${response.status} на ${method} ${path}`,
      )
    }

    const text = await response.text()
    return (text ? JSON.parse(text) : null) as T
  }

  private async token(): Promise<string> {
    if (this.accessToken) return this.accessToken

    const response = await this.fetchImpl(`${this.config.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.config.email,
        password: this.config.password,
      }),
    })

    if (!response.ok) {
      // Причина отказа входа не раскрывается наружу подробнее, чем нужно, но и не
      // прячется: без неё «ничего не работает» неотличимо от «неверный пароль».
      throw new WorkTaskError(
        response.status,
        `Не удалось войти в WorkTask (${response.status}). Проверьте WORKTASK_EMAIL и WORKTASK_PASSWORD`,
      )
    }

    const data = (await response.json()) as { accessToken?: string }
    if (!data.accessToken)
      throw new WorkTaskError(500, 'WorkTask не вернул токен доступа')

    this.accessToken = data.accessToken
    return this.accessToken
  }
}

/**
 * Конфигурация из окружения. Отсутствие переменной — остановка на старте, а не
 * попытка работать «как-нибудь»: сервер без адреса и учётных данных выглядел бы
 * рабочим и молча не отвечал бы ни на один вызов (**W-06**).
 */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): WorkTaskConfig {
  const baseUrl = (env.WORKTASK_BASE_URL ?? '').replace(/\/+$/, '')
  const email = env.WORKTASK_EMAIL ?? ''
  const password = env.WORKTASK_PASSWORD ?? ''

  const missing = [
    baseUrl ? null : 'WORKTASK_BASE_URL',
    email ? null : 'WORKTASK_EMAIL',
    password ? null : 'WORKTASK_PASSWORD',
  ].filter((name): name is string => name !== null)

  if (missing.length > 0)
    throw new Error(
      `Не заданы переменные окружения: ${missing.join(', ')}. ` +
        'Учётные данные заводит владелец — MCP-сервер их не запрашивает.',
    )

  return { baseUrl, email, password }
}
