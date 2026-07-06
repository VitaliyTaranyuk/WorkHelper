/**
 * Чистые правила perfect negotiation для mesh (§4 ADR, паттерн W3C/MDN).
 * Инициатор пары — новичок (получивший hello.peers). «Вежливость» (кто
 * уступает при glare) — детерминированное сравнение sessionId: одинаковый
 * вывод на обеих сторонах без обращения к часам (clock skew не влияет).
 */

/** Вежливая сторона пары: лексикографически МЕНЬШИЙ sessionId. */
export function isPolite(selfSessionId: string, peerSessionId: string): boolean {
  return selfSessionId < peerSessionId
}

/**
 * Принимать ли входящий offer при коллизии (у нас свой offer в полёте или
 * signalingState != stable): невежливая сторона игнорирует, вежливая
 * принимает (setRemoteDescription сделает implicit rollback).
 */
export function shouldAcceptOffer(params: {
  polite: boolean
  makingOffer: boolean
  signalingStable: boolean
}): boolean {
  const collision = params.makingOffer || !params.signalingStable
  return !collision || params.polite
}

/**
 * Кто пересоздаёт соединение после фатального failed: ровно одна сторона —
 * невежливая (иначе оба офферят одновременно или никто).
 */
export function isRecoveryInitiator(selfSessionId: string, peerSessionId: string): boolean {
  return !isPolite(selfSessionId, peerSessionId)
}
