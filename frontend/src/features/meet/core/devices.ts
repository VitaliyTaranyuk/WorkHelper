import type { MediaAccess } from './types'

export type MediaDeviceOption = {
  deviceId: string
  label: string
}

export type LocalMediaResult = {
  stream: MediaStream | null
  access: MediaAccess
}

/** Браузер без WebRTC/getUserMedia — честный экран вместо белого (§7 ADR). */
export function isBrowserSupported(): boolean {
  return (
    typeof RTCPeerConnection !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

/**
 * Захват локальных медиа с деградацией: камера+микрофон → только микрофон →
 * без устройств (recvonly-вход разрешён). Ошибка доступа различается по
 * DOMException.name — у пользователя понятное состояние, не белый экран.
 */
export async function acquireLocalMedia(constraints?: {
  audioDeviceId?: string
  videoDeviceId?: string
}): Promise<LocalMediaResult> {
  if (!isBrowserSupported()) return { stream: null, access: 'unsupported' }

  const audio: MediaTrackConstraints | boolean = constraints?.audioDeviceId
    ? { deviceId: { exact: constraints.audioDeviceId } }
    : true
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    ...(constraints?.videoDeviceId
      ? { deviceId: { exact: constraints.videoDeviceId } }
      : {}),
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video })
    return { stream, access: 'granted' }
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    // Камеры нет/занята — пробуем только звук (приоритет звука, §7)
    if (
      name === 'NotFoundError' ||
      name === 'NotReadableError' ||
      name === 'OverconstrainedError'
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio })
        return { stream, access: 'partial-audio' }
      } catch (audioError) {
        const audioName =
          audioError instanceof DOMException ? audioError.name : ''
        return {
          stream: null,
          access: audioName === 'NotAllowedError' ? 'denied' : 'no-devices',
        }
      }
    }
    if (name === 'NotAllowedError') return { stream: null, access: 'denied' }
    return { stream: null, access: 'no-devices' }
  }
}

/**
 * ТП-189: очистка ярлыка устройства от служебного USB-идентификатора
 * VID:PID, который Chrome дописывает в конец label — «HD Webcam C920
 * (046d:082d)» → «HD Webcam C920». Хвост в скобках — ровно 4 hex : 4 hex,
 * поэтому осмысленные названия со скобками (напр. «Микрофон (Realtek)») не
 * затрагиваются. Пустой результат после чистки — оставляем исходный label.
 */
export function cleanDeviceLabel(label: string): string {
  const cleaned = label.replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)\s*$/, '').trim()
  return cleaned || label
}

/** Списки устройств для выбора (после выдачи разрешения label непустой). */
export async function listDevices(): Promise<{
  microphones: MediaDeviceOption[]
  cameras: MediaDeviceOption[]
}> {
  if (!isBrowserSupported()) return { microphones: [], cameras: [] }
  const devices = await navigator.mediaDevices.enumerateDevices()
  const toOption = (device: MediaDeviceInfo, index: number, kind: string) => ({
    deviceId: device.deviceId,
    label: device.label ? cleanDeviceLabel(device.label) : `${kind} ${index + 1}`,
  })
  return {
    microphones: devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => toOption(d, i, 'Микрофон')),
    cameras: devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => toOption(d, i, 'Камера')),
  }
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

/** Человекочитаемое объяснение состояния доступа (для лобби и звонка). */
export function accessMessage(access: MediaAccess): string | null {
  switch (access) {
    case 'denied':
      return 'Доступ к камере и микрофону запрещён. Разрешите доступ в настройках браузера (значок замка в адресной строке) и повторите.'
    case 'no-devices':
      return 'Камера и микрофон не найдены. Можно войти и только смотреть/слушать участников.'
    case 'partial-audio':
      return 'Камера недоступна — вы войдёте только со звуком.'
    case 'unsupported':
      return 'Браузер не поддерживает видеовстречи (WebRTC). Откройте WorkTask в актуальном Chrome, Edge, Firefox или Safari.'
    default:
      return null
  }
}
