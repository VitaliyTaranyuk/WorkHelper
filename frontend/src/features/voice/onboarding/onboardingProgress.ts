/**
 * Прогресс интерактивного обучения голосовому помощнику (ТП-118).
 *
 * Пришло на смену булеву флагу `command/onboardingState.ts` (ТП-107): теперь
 * обучение — многошаговый мастер (проверка оборудования → калибровка →
 * практика), и прогресс нужно сохранять, чтобы можно было «пройти позже»,
 * пропустить или продолжить с места остановки.
 *
 * Хранение — per-браузер (localStorage), как хоткей: обучение персонально и не
 * зависит от аккаунта/бэкенда. Модель версионирована (`v2`), чтобы существующие
 * пользователи один раз увидели новый онбординг, а формат можно было развивать.
 */

const KEY = 'voice.onboarding.v2'

export type OnboardingStatus =
  | 'not_started' // ещё не предлагали / не начинал
  | 'in_progress' // начал, но не завершил
  | 'later' // отложил («пройти позже») — предложим снова в след. сессии
  | 'skipped' // отказался — сам не предлагаем, доступно из справки
  | 'completed' // прошёл до конца

/** Стадии мастера (порядок = порядок прохождения). Для возобновления с места. */
export const ONBOARDING_STAGES = [
  'welcome',
  'hardware',
  'calibration',
  'practice',
  'done',
] as const
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number]

export type OnboardingProgress = {
  status: OnboardingStatus
  /** Последняя достигнутая стадия — для «продолжить». */
  stage: OnboardingStage
  updatedAt: number
}

export const DEFAULT_PROGRESS: OnboardingProgress = {
  status: 'not_started',
  stage: 'welcome',
  updatedAt: 0,
}

function isStage(v: unknown): v is OnboardingStage {
  return (
    typeof v === 'string' &&
    (ONBOARDING_STAGES as readonly string[]).includes(v)
  )
}

function isStatus(v: unknown): v is OnboardingStatus {
  return (
    v === 'not_started' ||
    v === 'in_progress' ||
    v === 'later' ||
    v === 'skipped' ||
    v === 'completed'
  )
}

/** Нормализует произвольный объект из хранилища в валидный прогресс. */
export function parseProgress(raw: unknown): OnboardingProgress {
  if (!raw || typeof raw !== 'object') return DEFAULT_PROGRESS
  const o = raw as Record<string, unknown>
  return {
    status: isStatus(o.status) ? o.status : DEFAULT_PROGRESS.status,
    stage: isStage(o.stage) ? o.stage : DEFAULT_PROGRESS.stage,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : 0,
  }
}

export function getProgress(): OnboardingProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_PROGRESS
    return parseProgress(JSON.parse(raw))
  } catch {
    return DEFAULT_PROGRESS
  }
}

export function setProgress(
  patch: Partial<Omit<OnboardingProgress, 'updatedAt'>>,
): OnboardingProgress {
  const next: OnboardingProgress = {
    ...getProgress(),
    ...patch,
    updatedAt: Date.now(),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // приватный режим — не сохранится, приложение работает
  }
  return next
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // no-op
  }
}

/**
 * Нужно ли предлагать обучение при заходе в помощник. Предлагаем, пока не
 * начинал или отложил на потом; пропустившим и завершившим — нет (у них есть
 * запуск из справки). Чистая функция — тестируется без localStorage.
 */
export function shouldOffer(progress: OnboardingProgress): boolean {
  return progress.status === 'not_started' || progress.status === 'later'
}
