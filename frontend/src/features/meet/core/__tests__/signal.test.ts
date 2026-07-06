import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetSignalClient } from '../signal'
import type { SignalIn, SignalStatus } from '../types'

/** Минимальный управляемый фейк WebSocket. */
class FakeSocket {
  static instances: FakeSocket[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  readyState: number = WebSocket.CONNECTING
  sent: string[] = []
  url: string

  constructor(url: string) {
    this.url = url
    FakeSocket.instances.push(this)
  }

  open() {
    this.readyState = WebSocket.OPEN
    this.onopen?.()
  }

  serverSend(message: SignalIn) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }

  serverClose() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.()
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.()
  }
}

describe('MeetSignalClient — соединение, переподключение, фатальные отказы', () => {
  let statuses: SignalStatus[]
  let messages: SignalIn[]

  const makeClient = () =>
    new MeetSignalClient(
      () => 'ws://test/ws/meet',
      {
        onStatus: (s) => statuses.push(s),
        onMessage: (m) => messages.push(m),
      },
      (url) => new FakeSocket(url) as unknown as WebSocket,
    )

  beforeEach(() => {
    vi.useFakeTimers()
    FakeSocket.instances = []
    statuses = []
    messages = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('открытие соединения даёт connected и парсит сообщения', () => {
    const client = makeClient()
    client.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.serverSend({ type: 'pong' })

    expect(statuses).toEqual(['connecting', 'connected'])
    expect(messages).toEqual([{ type: 'pong' }])
  })

  it('обрыв планирует переподключение с backoff', () => {
    const client = makeClient()
    client.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.serverClose()

    expect(statuses).toContain('reconnecting')
    expect(FakeSocket.instances).toHaveLength(1)

    vi.advanceTimersByTime(1000) // > backoff первой попытки (500мс + jitter)
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('фатальный отказ сервера (REMOVED/ROOM_FULL) не переподключается', () => {
    const client = makeClient()
    client.connect()
    FakeSocket.instances[0]!.open()
    FakeSocket.instances[0]!.serverSend({
      type: 'error',
      code: 'REMOVED',
      message: 'удалён',
    })
    FakeSocket.instances[0]!.serverClose()

    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
    expect(statuses.at(-1)).toBe('closed')
  })

  it('close() пользователем не переподключается', () => {
    const client = makeClient()
    client.connect()
    FakeSocket.instances[0]!.open()
    client.close()

    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
    expect(statuses.at(-1)).toBe('closed')
  })

  it('backoff растёт экспоненциально и ограничен потолком', () => {
    const noJitter = () => 0
    expect(MeetSignalClient.backoffDelay(0, noJitter)).toBe(500)
    expect(MeetSignalClient.backoffDelay(1, noJitter)).toBe(1000)
    expect(MeetSignalClient.backoffDelay(3, noJitter)).toBe(4000)
    expect(MeetSignalClient.backoffDelay(10, noJitter)).toBe(8000)
  })
})
