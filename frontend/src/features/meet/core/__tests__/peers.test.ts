import { describe, expect, it } from 'vitest'
import { initialRoomState, isSelfHost, roomReducer } from '../peers'
import type { MeetPeer, SignalIn } from '../types'

const peer = (sessionId: string, userId = `u-${sessionId}`): MeetPeer => ({
  sessionId,
  userId,
  name: `Имя ${sessionId}`,
  muted: false,
  cameraOn: true,
  screenSharing: false,
  joinedAt: 1,
})

const hello = (peers: MeetPeer[] = []): SignalIn => ({
  type: 'hello',
  self: 's-me',
  selfUserId: 'u-me',
  host: 'u-host',
  roomTitle: 'Планёрка',
  maxParticipants: 8,
  peers,
})

const signal = (message: SignalIn) =>
  ({ kind: 'signal', message }) as const

describe('roomReducer — состояние комнаты из сообщений сигналинга', () => {
  it('hello: снапшот вытесняет прежний список участников', () => {
    let state = roomReducer(initialRoomState, signal(hello([peer('s-old')])))
    state = roomReducer(state, signal(hello([peer('s-new')])))

    expect(state.peers.map((p) => p.sessionId)).toEqual(['s-new'])
    expect(state.selfSessionId).toBe('s-me')
    expect(state.roomTitle).toBe('Планёрка')
    expect(state.maxParticipants).toBe(8)
  })

  it('peer-joined добавляет участника и не дублирует его', () => {
    let state = roomReducer(initialRoomState, signal(hello()))
    state = roomReducer(state, signal({ type: 'peer-joined', peer: peer('s-a') }))
    state = roomReducer(state, signal({ type: 'peer-joined', peer: peer('s-a') }))

    expect(state.peers).toHaveLength(1)
  })

  it('peer-left убирает участника', () => {
    let state = roomReducer(initialRoomState, signal(hello([peer('s-a'), peer('s-b')])))
    state = roomReducer(state, signal({ type: 'peer-left', sessionId: 's-a', reason: 'left' }))

    expect(state.peers.map((p) => p.sessionId)).toEqual(['s-b'])
  })

  it('state обновляет медиа-präсенс участника', () => {
    let state = roomReducer(initialRoomState, signal(hello([peer('s-a')])))
    state = roomReducer(
      state,
      signal({ type: 'state', sessionId: 's-a', muted: true, cameraOn: false, screenSharing: false }),
    )

    expect(state.peers[0]).toMatchObject({ muted: true, cameraOn: false })
  })

  it('chat накапливается, host-changed меняет организатора', () => {
    let state = roomReducer(initialRoomState, signal(hello()))
    state = roomReducer(
      state,
      signal({ type: 'chat', sessionId: 's-a', name: 'Аня', text: 'Привет', at: 1 }),
    )
    state = roomReducer(state, signal({ type: 'host-changed', host: 'u-new' }))

    expect(state.chat).toHaveLength(1)
    expect(state.hostUserId).toBe('u-new')
  })

  it('фатальные ошибки сервера превращаются в refusal', () => {
    const full = roomReducer(
      initialRoomState,
      signal({ type: 'error', code: 'ROOM_FULL', message: '' }),
    )
    const removed = roomReducer(
      initialRoomState,
      signal({ type: 'error', code: 'REMOVED', message: '' }),
    )

    expect(full.refusal).toBe('ROOM_FULL')
    expect(removed.refusal).toBe('REMOVED')
  })

  it('host-mute поднимает флаг запроса и сбрасывается после обработки', () => {
    let state = roomReducer(initialRoomState, signal({ type: 'host-mute' }))
    expect(state.muteRequested).toBe(true)

    state = roomReducer(state, { kind: 'mute-request-handled' })
    expect(state.muteRequested).toBe(false)
  })

  it('isSelfHost сверяет свой userId с организатором', () => {
    const state = roomReducer(
      initialRoomState,
      signal({ ...hello(), host: 'u-me' } as SignalIn),
    )
    expect(isSelfHost(state)).toBe(true)
  })
})
