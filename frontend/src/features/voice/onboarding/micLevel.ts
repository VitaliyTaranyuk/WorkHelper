/**
 * Чистые помощники для проверки/калибровки микрофона (ТП-118). Вынесены из
 * хука `useMicCheck`, чтобы математику уровня сигнала и разбор ошибок доступа
 * можно было покрыть unit-тестами без реального Web Audio/getUserMedia.
 */

export type MicPermission = 'unknown' | 'prompt' | 'granted' | 'denied'

export type MicError = {
  permission: MicPermission
  /** Понятное пользователю сообщение + как исправить. */
  message: string
}

/**
 * RMS (среднеквадратичный уровень) для кадра time-domain из AnalyserNode
 * (getByteTimeDomainData: 0..255, тишина = 128). Результат нормирован в 0..1.
 */
export function rmsFromTimeDomain(bytes: Uint8Array | number[]): number {
  if (!bytes || bytes.length === 0) return 0
  let sumSq = 0
  for (let i = 0; i < bytes.length; i++) {
    const v = (bytes[i] - 128) / 128 // -1..1
    sumSq += v * v
  }
  return Math.sqrt(sumSq / bytes.length)
}

/**
 * Переводит RMS в отображаемый уровень 0..1. Речь по RMS редко превышает ~0.3,
 * поэтому масштабируем, чтобы шкала была наглядной, и подрезаем на 1.
 */
export function displayLevel(rms: number, gain = 3): number {
  if (!Number.isFinite(rms) || rms <= 0) return 0
  return Math.min(1, rms * gain)
}

/** Экспоненциальное сглаживание (чтобы полоска не дёргалась). */
export function smooth(prev: number, next: number, factor = 0.4): number {
  return prev + (next - prev) * factor
}

/** Порог «есть входящий сигнал» по отображаемому уровню. */
export const SIGNAL_THRESHOLD = 0.12

export function hasSignal(level: number): boolean {
  return level >= SIGNAL_THRESHOLD
}

/**
 * Разбирает ошибку getUserMedia в понятную пару {permission, message}.
 * Имена ошибок — из спецификации MediaDevices (DOMException.name).
 */
export function mapMicError(err: unknown): MicError {
  const name =
    err && typeof err === 'object' && 'name' in err
      ? String((err as { name: unknown }).name)
      : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        permission: 'denied',
        message:
          'Доступ к микрофону запрещён. Разрешите его в настройках браузера ' +
          '(значок замка в адресной строке → «Микрофон» → «Разрешить») и ' +
          'повторите проверку.',
      }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        permission: 'granted',
        message:
          'Микрофон не найден. Подключите микрофон или гарнитуру и повторите ' +
          'проверку.',
      }
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        permission: 'granted',
        message:
          'Микрофон занят другим приложением. Закройте программы, которые могут ' +
          'его использовать (звонки, запись), и повторите.',
      }
    default:
      return {
        permission: 'unknown',
        message:
          'Не удалось получить доступ к микрофону. Проверьте подключение ' +
          'устройства и настройки браузера, затем повторите.',
      }
  }
}

/**
 * Итог калибровки по накопленному пиковому уровню: успех/тихо/нет сигнала —
 * с рекомендацией. Чистая функция для тестов и переиспользования в UI.
 */
export type CalibrationVerdict = {
  ok: boolean
  tone: 'success' | 'warning' | 'error'
  message: string
}

export function calibrationVerdict(peakLevel: number): CalibrationVerdict {
  if (peakLevel >= 0.35) {
    return {
      ok: true,
      tone: 'success',
      message: 'Отличный уровень сигнала — микрофон вас хорошо слышит.',
    }
  }
  if (peakLevel >= SIGNAL_THRESHOLD) {
    return {
      ok: true,
      tone: 'warning',
      message:
        'Голос распознаётся, но сигнал тихий. Придвиньтесь ближе к микрофону ' +
        'или увеличьте его громкость в настройках системы.',
    }
  }
  return {
    ok: false,
    tone: 'error',
    message:
      'Сигнал почти не слышен. Проверьте, что выбран нужный микрофон и он не ' +
      'выключен, затем повторите проверку.',
  }
}
