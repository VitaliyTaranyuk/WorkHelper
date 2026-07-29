/**
 * Реестр идущей диктовки (ТП-241).
 *
 * Зачем: «Создать» и «Сохранить» живут в модалке/карточке, а сессия диктовки —
 * в поле описания. Требование задачи — нажать «Создать» прямо во время
 * диктовки, не нажимая «Остановить запись». Обработчик отправки обязан
 * ЗАКОНЧИТЬ сессию и увидеть надиктованный текст в форме ДО того, как соберёт
 * значения, — иначе задача уйдёт на сервер без последней фразы.
 *
 * Почему модуль, а не React-контекст/стор: одновременно активна ровно одна
 * сессия (микрофон один), а значение нужно синхронно внутри обработчика —
 * подписка и ре-рендеры здесь ничего не дают. Регистрация снимается при
 * завершении сессии и при размонтировании поля.
 */

type Finalize = () => void

let activeFinalize: Finalize | null = null

/** Сессия началась: `finalize` завершает её и пишет текст в поле синхронно. */
export function setActiveDictation(finalize: Finalize): void {
  activeFinalize = finalize
}

/** Сессия закончилась (или поле размонтировано) — снимаем регистрацию. */
export function clearActiveDictation(finalize: Finalize): void {
  // Сверка с текущей: поле могло размонтироваться уже после того, как сессию
  // начали в другом месте — тогда чужую регистрацию снимать нельзя.
  if (activeFinalize === finalize) activeFinalize = null
}

export function isDictationActive(): boolean {
  return activeFinalize !== null
}

/**
 * Завершить идущую диктовку, если она есть. Возвращает промис, чтобы точки
 * отправки писались единообразно (`await finalizeActiveDictation()`), но текст
 * попадает в форму синхронно — до первого await.
 */
export async function finalizeActiveDictation(): Promise<void> {
  activeFinalize?.()
}

/**
 * Только что законченная диктовка, чьё улучшение ещё в пути (ТП-241).
 *
 * `local` — текст, который УЖЕ вставлен в поле и с которым задача будет
 * создана; `enhanced` — промис вычищенного варианта (тот же, что ждёт сам
 * конвейер, второго запроса к модели не делается). Точка создания забирает
 * слот и, если задача создана именно с `local`, дописывает ей вычищенный
 * вариант фоном — форма к тому моменту уже закрыта.
 */
export type PendingDictation = {
  local: string
  enhanced: Promise<string>
  at: number
}

/**
 * Слот живёт минуту: он нужен ровно на путь «закончил диктовку → создал
 * задачу». Всё, что дольше, — это уже другая диктовка (правка в карточке,
 * комментарий), и приписывать её к случайной последующей задаче нельзя.
 */
const PENDING_TTL_MS = 60_000

let pending: PendingDictation | null = null

export function setPendingDictation(local: string, enhanced: Promise<string>): void {
  // Промис уходит в фон и обязан быть безопасным: enhanceTextSafe никогда не
  // бросает, но слот может быть и не востребован — гасим на всякий случай,
  // чтобы не оставить unhandled rejection.
  enhanced.catch(() => undefined)
  pending = { local, enhanced, at: Date.now() }
}

/** Забрать слот (одноразово). `null` — слота нет или он протух. */
export function takePendingDictation(): PendingDictation | null {
  const current = pending
  pending = null
  if (!current) return null
  return Date.now() - current.at <= PENDING_TTL_MS ? current : null
}
