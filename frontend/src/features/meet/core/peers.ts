import type { MeetChatMessage, MeetPeer, MeetRefusal, SignalIn } from './types'

/**
 * Чистое состояние комнаты, производное от сообщений сигналинга. Редьюсер —
 * единственный источник истины о составе участников для UI; медиапотоки
 * живут отдельно (RtcManager) и матчатся по sessionId.
 */
export type RoomState = {
  selfSessionId: string | null
  selfUserId: string | null
  hostUserId: string | null
  roomTitle: string | null
  maxParticipants: number
  peers: MeetPeer[]
  chat: MeetChatMessage[]
  /** Организатор попросил нас выключить микрофон (обрабатывается один раз). */
  muteRequested: boolean
  refusal: MeetRefusal | null
}

export const initialRoomState: RoomState = {
  selfSessionId: null,
  selfUserId: null,
  hostUserId: null,
  roomTitle: null,
  maxParticipants: 8,
  peers: [],
  chat: [],
  muteRequested: false,
  refusal: null,
}

export type RoomAction =
  | { kind: 'signal'; message: SignalIn }
  | { kind: 'mute-request-handled' }
  | { kind: 'reset' }

const MAX_CHAT_KEPT = 500

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  if (action.kind === 'reset')
    return { ...initialRoomState, maxParticipants: state.maxParticipants }
  if (action.kind === 'mute-request-handled')
    return { ...state, muteRequested: false }

  const message = action.message
  switch (message.type) {
    case 'hello':
      return {
        ...state,
        selfSessionId: message.self,
        selfUserId: message.selfUserId,
        hostUserId: message.host,
        roomTitle: message.roomTitle,
        maxParticipants: message.maxParticipants,
        // Свежий снапшот после (пере)подключения вытесняет старый список
        peers: message.peers,
        refusal: null,
      }
    case 'peer-joined': {
      const exists = state.peers.some(
        (p) => p.sessionId === message.peer.sessionId,
      )
      return exists
        ? state
        : { ...state, peers: [...state.peers, message.peer] }
    }
    case 'peer-left':
      return {
        ...state,
        peers: state.peers.filter((p) => p.sessionId !== message.sessionId),
      }
    case 'state':
      return {
        ...state,
        peers: state.peers.map((p) =>
          p.sessionId === message.sessionId
            ? {
                ...p,
                muted: message.muted,
                cameraOn: message.cameraOn,
                screenSharing: message.screenSharing,
              }
            : p,
        ),
      }
    case 'chat':
      return {
        ...state,
        chat: [
          ...state.chat.slice(-(MAX_CHAT_KEPT - 1)),
          {
            sessionId: message.sessionId,
            name: message.name,
            text: message.text,
            at: message.at,
          },
        ],
      }
    case 'host-changed':
      return { ...state, hostUserId: message.host }
    case 'host-mute':
      return { ...state, muteRequested: true }
    case 'error':
      if (message.code === 'ROOM_FULL')
        return { ...state, refusal: 'ROOM_FULL' }
      if (message.code === 'REMOVED') return { ...state, refusal: 'REMOVED' }
      return state
    default:
      return state
  }
}

/** Я — host? (создатель в комнате или самый ранний после его ухода) */
export function isSelfHost(state: RoomState): boolean {
  return state.selfUserId !== null && state.selfUserId === state.hostUserId
}
