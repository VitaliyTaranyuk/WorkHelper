/**
 * Типы подсистемы WorkTask Meet (.ai/MEET_ARCHITECTURE.md).
 * Сообщения зеркалят протокол backend (MeetSignalHandler).
 */

/** Участник комнаты, как его знает сигналинг (präсенс). */
export type MeetPeer = {
  sessionId: string
  userId: string
  name: string
  username?: string
  muted: boolean
  cameraOn: boolean
  screenSharing: boolean
  joinedAt: number
}

export type MeetChatMessage = {
  sessionId: string
  name: string
  text: string
  at: number
}

/** Входящие сообщения сигналинга (сервер → клиент). */
export type SignalIn =
  | {
      type: 'hello'
      self: string
      selfUserId: string
      host: string
      roomTitle: string
      maxParticipants: number
      peers: MeetPeer[]
    }
  | { type: 'peer-joined'; peer: MeetPeer }
  | { type: 'peer-left'; sessionId: string; reason: 'left' | 'removed' }
  | {
      type: 'state'
      sessionId: string
      muted: boolean
      cameraOn: boolean
      screenSharing: boolean
    }
  | { type: 'offer'; from: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; from: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; from: string; candidate: RTCIceCandidateInit | null }
  | ({ type: 'chat' } & MeetChatMessage)
  | { type: 'host-mute' }
  | { type: 'host-changed'; host: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' }

/** Исходящие сообщения (клиент → сервер). */
export type SignalOut =
  | { type: 'offer'; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; to: string; candidate: RTCIceCandidateInit | null }
  | {
      type: 'state'
      muted?: boolean
      cameraOn?: boolean
      screenSharing?: boolean
    }
  | { type: 'chat'; text: string }
  | { type: 'host-mute'; target: string }
  | { type: 'host-remove'; target: string }
  | { type: 'ping' }

/** Статус сигнального соединения для UI. */
export type SignalStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed'

/** Почему нас не пустили/выкинули (для честного экрана, не белого). */
export type MeetRefusal = 'ROOM_FULL' | 'REMOVED' | 'AUTH' | 'GONE'

/** Состояние доступа к устройствам в лобби и звонке. */
export type MediaAccess =
  | 'pending'
  | 'granted'
  | 'denied'
  | 'no-devices'
  | 'partial-audio'
  | 'unsupported'
