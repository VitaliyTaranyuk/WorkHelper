import { describe, expect, it, vi } from 'vitest'

describe('buildMeetWsUrl — адрес сигналинга из базового адреса API', () => {
  it('https → wss с сохранением хоста и query', async () => {
    vi.doMock('@/config', () => ({
      WORKTECH_API_BASE_URL: 'https://wowoffcata.hlab.kz',
    }))
    const { buildMeetWsUrl } = await import('../wsUrl')
    const url = buildMeetWsUrl('room-1', 'jwt-1')
    expect(url).toBe(
      'wss://wowoffcata.hlab.kz/work-task/ws/meet?room=room-1&token=jwt-1',
    )
    vi.doUnmock('@/config')
    vi.resetModules()
  })

  it('http с префиксом пути → ws, префикс сохранён', async () => {
    vi.doMock('@/config', () => ({
      WORKTECH_API_BASE_URL: 'http://91.211.249.37/test',
    }))
    vi.resetModules()
    const { buildMeetWsUrl } = await import('../wsUrl')
    const url = buildMeetWsUrl('r', 't')
    expect(url).toBe('ws://91.211.249.37/test/work-task/ws/meet?room=r&token=t')
    vi.doUnmock('@/config')
    vi.resetModules()
  })
})
