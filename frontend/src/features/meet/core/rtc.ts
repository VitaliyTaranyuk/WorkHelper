import { isPolite, isRecoveryInitiator, shouldAcceptOffer } from './negotiation'
import type { MeetPeer, SignalOut } from './types'

export type RtcEvents = {
  /** Появился/обновился удалённый поток участника. */
  onRemoteStream: (sessionId: string, stream: MediaStream) => void
  /** Состояние транспорта пары (для индикатора на плитке). */
  onConnectionState: (sessionId: string, state: RTCPeerConnectionState) => void
  /** Метрика: первое успешное соединение пары (setupMs) или фатальный ICE-фейл. */
  onStats: (event: 'connected' | 'ice-failed', detail: { setupMs?: number }) => void
}

type PeerLink = {
  pc: RTCPeerConnection
  polite: boolean
  makingOffer: boolean
  /** Кандидаты, пришедшие до setRemoteDescription. */
  pendingCandidates: RTCIceCandidateInit[]
  remoteDescribed: boolean
  createdAt: number
  everConnected: boolean
  restartedOnce: boolean
}

/**
 * Mesh-фабрика RTCPeerConnection (ADR-011): по соединению на пару участников,
 * perfect negotiation (новичок-offer, вежливость по sessionId §4),
 * восстановление: restartIce при ICE-failed, пересоздание пары одной стороной
 * при фатальном failed. Замена топологии (SFU) меняет только этот модуль —
 * сигналинг и UI от него не зависят.
 */
export class RtcManager {
  private links = new Map<string, PeerLink>()
  private localStream: MediaStream | null = null
  private audioMode = false

  private readonly iceServers: RTCIceServer[]
  private readonly selfSessionId: string
  private readonly send: (message: SignalOut) => void
  private readonly events: RtcEvents
  private readonly createPc: (config: RTCConfiguration) => RTCPeerConnection

  constructor(
    iceServers: RTCIceServer[],
    selfSessionId: string,
    send: (message: SignalOut) => void,
    events: RtcEvents,
    /** Инъекция для тестов. */
    createPc: (config: RTCConfiguration) => RTCPeerConnection = (config) =>
      new RTCPeerConnection(config),
  ) {
    this.iceServers = iceServers
    this.selfSessionId = selfSessionId
    this.send = send
    this.events = events
    this.createPc = createPc
  }

  setLocalStream(stream: MediaStream | null): void {
    this.localStream = stream
  }

  /** Новичок (мы) устанавливает соединение с каждым из hello.peers. */
  connectTo(peer: MeetPeer): void {
    this.ensureLink(peer.sessionId, /* initiator */ true)
  }

  /** Пришёл offer — создаём/используем соединение (MDN perfect negotiation). */
  async onOffer(fromSessionId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const link = this.ensureLink(fromSessionId, false)
    const accept = shouldAcceptOffer({
      polite: link.polite,
      makingOffer: link.makingOffer,
      signalingStable: link.pc.signalingState === 'stable',
    })
    if (!accept) return // glare: невежливая сторона игнорирует встречный offer
    try {
      // setRemoteDescription(offer) делает implicit rollback вежливой стороне
      await link.pc.setRemoteDescription(sdp)
      link.remoteDescribed = true
      await this.drainCandidates(link)
      await link.pc.setLocalDescription() // parameterless => answer
      this.send({ type: 'answer', to: fromSessionId, sdp: link.pc.localDescription! })
    } catch {
      // соединение пересоздаст восстановление по connectionState
    }
  }

  async onAnswer(fromSessionId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const link = this.links.get(fromSessionId)
    if (!link) return
    try {
      await link.pc.setRemoteDescription(sdp)
      link.remoteDescribed = true
      await this.drainCandidates(link)
    } catch {
      /* восстановление по connectionState */
    }
  }

  async onIce(fromSessionId: string, candidate: RTCIceCandidateInit | null): Promise<void> {
    const link = this.links.get(fromSessionId)
    if (!link || candidate === null) return
    if (!link.remoteDescribed) {
      link.pendingCandidates.push(candidate)
      return
    }
    try {
      await link.pc.addIceCandidate(candidate)
    } catch {
      /* устаревший кандидат после рестарта — безопасно игнорируется */
    }
  }

  /** Участник вышел — закрываем его соединение. */
  drop(sessionId: string): void {
    const link = this.links.get(sessionId)
    if (!link) return
    link.pc.close()
    this.links.delete(sessionId)
  }

  /** Полный сброс (новый hello после обрыва сигналинга пересоберёт mesh). */
  reset(): void {
    for (const link of this.links.values()) link.pc.close()
    this.links.clear()
  }

  /**
   * «Аудио-режим» (§7): перестаём принимать чужое видео (направление
   * video-трансиверов → sendonly), свой видеотрек продолжаем слать.
   */
  setAudioMode(enabled: boolean): void {
    this.audioMode = enabled
    for (const link of this.links.values()) this.applyAudioMode(link)
  }

  /** Замена видеотрека на лету (смена камеры/шеринг) — без пересоздания пары. */
  async replaceVideoTrack(track: MediaStreamTrack | null): Promise<void> {
    for (const link of this.links.values()) {
      const sender = link.pc
        .getSenders()
        .find((s) => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(track)
    }
  }

  connectionsCount(): number {
    return this.links.size
  }

  private ensureLink(sessionId: string, initiator: boolean): PeerLink {
    const existing = this.links.get(sessionId)
    if (existing) return existing
    return this.createLink(sessionId, initiator)
  }

  private createLink(sessionId: string, initiator: boolean): PeerLink {
    const pc = this.createPc({ iceServers: this.iceServers })
    const link: PeerLink = {
      pc,
      polite: isPolite(this.selfSessionId, sessionId),
      makingOffer: false,
      pendingCandidates: [],
      remoteDescribed: false,
      createdAt: Date.now(),
      everConnected: false,
      restartedOnce: false,
    }
    this.links.set(sessionId, link)

    this.attachLocalMedia(link)

    pc.onnegotiationneeded = async () => {
      try {
        link.makingOffer = true
        await pc.setLocalDescription()
        this.send({ type: 'offer', to: sessionId, sdp: pc.localDescription! })
      } catch {
        /* glare разрулит onOffer */
      } finally {
        link.makingOffer = false
      }
    }

    pc.onicecandidate = (event) => {
      this.send({
        type: 'ice',
        to: sessionId,
        candidate: event.candidate ? event.candidate.toJSON() : null,
      })
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0]
      if (stream) this.events.onRemoteStream(sessionId, stream)
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce()
    }

    pc.onconnectionstatechange = () => {
      this.events.onConnectionState(sessionId, pc.connectionState)
      if (pc.connectionState === 'connected') {
        if (!link.everConnected) {
          link.everConnected = true
          this.events.onStats('connected', { setupMs: Date.now() - link.createdAt })
        }
        link.restartedOnce = false
      }
      if (pc.connectionState === 'failed') {
        if (!link.restartedOnce) {
          link.restartedOnce = true
          this.recreate(sessionId)
        } else {
          this.events.onStats('ice-failed', {})
        }
      }
    }

    // Без локальных треков negotiationneeded не сработает у инициатора —
    // объявляем приёмные направления явно
    if (initiator && !this.hasLocalTracks()) {
      pc.addTransceiver('audio', { direction: 'recvonly' })
      pc.addTransceiver('video', { direction: 'recvonly' })
    }

    return link
  }

  /** Аудио добавляется первым — приоритет звука в bandwidth-аллокации (§7). */
  private attachLocalMedia(link: PeerLink): void {
    if (!this.localStream) return
    const audio = this.localStream.getAudioTracks()[0]
    const video = this.localStream.getVideoTracks()[0]
    if (audio) link.pc.addTrack(audio, this.localStream)
    else link.pc.addTransceiver('audio', { direction: 'recvonly' })
    if (video) link.pc.addTrack(video, this.localStream)
    else link.pc.addTransceiver('video', { direction: 'recvonly' })
    if (this.audioMode) this.applyAudioMode(link)
  }

  private applyAudioMode(link: PeerLink): void {
    for (const transceiver of link.pc.getTransceivers()) {
      if (transceiver.receiver.track?.kind !== 'video') continue
      if (this.audioMode)
        transceiver.direction =
          transceiver.direction === 'sendrecv' ? 'sendonly' : 'inactive'
      else
        transceiver.direction =
          transceiver.direction === 'sendonly' ? 'sendrecv' : 'recvonly'
    }
  }

  private recreate(sessionId: string): void {
    this.drop(sessionId)
    // Пересоздаёт ровно одна сторона пары — невежливая (см. negotiation.ts)
    if (isRecoveryInitiator(this.selfSessionId, sessionId))
      this.createLink(sessionId, true)
  }

  private async drainCandidates(link: PeerLink): Promise<void> {
    const pending = link.pendingCandidates.splice(0)
    for (const candidate of pending) {
      try {
        await link.pc.addIceCandidate(candidate)
      } catch {
        /* кандидат от прежней сессии ICE */
      }
    }
  }

  private hasLocalTracks(): boolean {
    return !!this.localStream && this.localStream.getTracks().length > 0
  }
}
