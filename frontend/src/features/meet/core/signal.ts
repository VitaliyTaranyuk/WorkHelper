import type { SignalIn, SignalOut, SignalStatus } from './types'

export type SignalEvents = {
  onMessage: (message: SignalIn) => void
  onStatus: (status: SignalStatus) => void
}

const PING_INTERVAL_MS = 25_000
const BACKOFF_BASE_MS = 500
const BACKOFF_MAX_MS = 8_000

/**
 * Сигнальный клиент Meet: WebSocket + автопереподключение с экспоненциальным
 * backoff и jitter (§7 ADR). После обрыва сервер выдаст свежий hello — верхний
 * слой пересобирает peer-соединения. Фатальные отказы (бан, комната заполнена)
 * приходят сообщением error и переподключение не запускают.
 */
export class MeetSignalClient {
  private ws: WebSocket | null = null
  private attempts = 0
  private closedByUser = false
  private fatal = false
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  private readonly buildUrl: () => string
  private readonly events: SignalEvents
  private readonly createSocket: (url: string) => WebSocket

  constructor(
    buildUrl: () => string,
    events: SignalEvents,
    /** Инъекция для тестов: фабрика WebSocket. */
    createSocket: (url: string) => WebSocket = (url) => new WebSocket(url),
  ) {
    this.buildUrl = buildUrl
    this.events = events
    this.createSocket = createSocket
  }

  connect(): void {
    if (this.closedByUser || this.fatal) return
    this.events.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
    const socket = this.createSocket(this.buildUrl())
    this.ws = socket

    socket.onopen = () => {
      this.attempts = 0
      this.events.onStatus('connected')
      this.startPing()
    }
    socket.onmessage = (event) => {
      let parsed: SignalIn
      try {
        parsed = JSON.parse(String(event.data)) as SignalIn
      } catch {
        return
      }
      // Фатальные отказы сервера: переподключаться бессмысленно
      if (
        parsed.type === 'error' &&
        (parsed.code === 'ROOM_FULL' || parsed.code === 'REMOVED')
      )
        this.fatal = true
      this.events.onMessage(parsed)
    }
    socket.onclose = () => {
      this.stopPing()
      if (this.closedByUser || this.fatal) {
        this.events.onStatus('closed')
        return
      }
      this.scheduleReconnect()
    }
    socket.onerror = () => {
      // onclose придёт следом — там и решаем про reconnect
    }
  }

  send(message: SignalOut): void {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(message))
  }

  close(): void {
    this.closedByUser = true
    this.stopPing()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.events.onStatus('closed')
  }

  /** Задержка перед n-й попыткой: 0.5с → 8с + jitter (не DDoS-ить сервер хором). */
  static backoffDelay(attempt: number, random: () => number = Math.random): number {
    const base = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS)
    return base + Math.floor(random() * 250)
  }

  private scheduleReconnect(): void {
    this.events.onStatus('reconnecting')
    const delay = MeetSignalClient.backoffDelay(this.attempts)
    this.attempts += 1
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => this.send({ type: 'ping' }), PING_INTERVAL_MS)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}
