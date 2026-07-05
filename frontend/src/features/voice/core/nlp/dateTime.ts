import dayjs from 'dayjs'

/** Лёгкая нормализация, СОХРАНЯЮЩАЯ разделители времени «:»/«.» (14:30). */
function normForDate(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[,;!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Разбор русских относительных дат/времени для голоса (ТП-104). Локально, без AI:
 * «завтра в 15», «в пятницу в 10 утра», «сегодня в 14:30», «послезавтра в 9».
 *
 * Возвращает распознанный момент (`at`) и `rest` — текст без даты/времени (для
 * названия встречи). `at === null` — момент не распознан (команда переспросит).
 * Ничего не выдумываем сверх сказанного: без времени — дефолт 10:00; без дня —
 * ближайший подходящий (сегодня/завтра, если время уже прошло).
 */
export type ParsedDateTime = { at: Date | null; rest: string }

const WEEKDAYS: Record<string, number> = {
  понедельник: 1,
  вторник: 2,
  среда: 3,
  среду: 3,
  четверг: 4,
  пятница: 5,
  пятницу: 5,
  суббота: 6,
  субботу: 6,
  воскресенье: 0,
}

const DEFAULT_HOUR = 10

// Без \b: в JS границы слова только ASCII и с кириллицей не работают.
// «в 15», «в 14:30», «в 9 утра», «в 7 вечера», «в 3 дня», «в 11 ночи»
const TIME_RE = /в\s+(\d{1,2})(?:[:.](\d{2}))?\s*(утра|дня|вечера|ночи)?/u
const RELDAY_RE = /(сегодня|завтра|послезавтра)/u
const WEEKDAY_RE =
  /(?:в\s+)?(понедельник|вторник|сред[уа]|четверг|пятниц[уа]|суббот[уа]|воскресенье)/u

function applyDaypart(hour: number, daypart?: string): number {
  if (!daypart) return hour
  if ((daypart === 'дня' || daypart === 'вечера') && hour < 12) return hour + 12
  if (daypart === 'ночи' && hour === 12) return 0
  return hour
}

export function parseRussianDateTime(
  text: string,
  now: Date = new Date(),
): ParsedDateTime {
  const norm = normForDate(text)

  const timeM = TIME_RE.exec(norm)
  const relM = RELDAY_RE.exec(norm)
  const wdM = WEEKDAY_RE.exec(norm)

  if (!timeM && !relM && !wdM) return { at: null, rest: text.trim() }

  let d = dayjs(now).second(0).millisecond(0)

  // День
  if (relM) {
    const shift = relM[1] === 'завтра' ? 1 : relM[1] === 'послезавтра' ? 2 : 0
    d = d.add(shift, 'day')
  } else if (wdM) {
    const target = WEEKDAYS[wdM[1]]
    // ближайшая дата этого дня недели, включая сегодня (коррекция «в прошлом» ниже)
    const diff = (target - d.day() + 7) % 7
    d = d.add(diff, 'day')
  }

  // Время
  if (timeM) {
    const hour = applyDaypart(Number(timeM[1]), timeM[3])
    const minute = timeM[2] ? Number(timeM[2]) : 0
    d = d.hour(Math.min(hour, 23)).minute(Math.min(minute, 59))
  } else {
    d = d.hour(DEFAULT_HOUR).minute(0)
  }

  // Коррекция «в прошлом», когда день НЕ задан явно (сегодня/только время) или
  // назван сегодняшний день недели: переносим на следующий подходящий.
  const dayExplicit = relM && relM[1] !== 'сегодня'
  if (!dayExplicit && d.isBefore(dayjs(now))) {
    d = d.add(wdM ? 7 : 1, 'day')
  }

  // Название: убираем распознанные фрагменты даты/времени, затем служебные слова
  // (по токенам — без \b, который в JS не работает с кириллицей).
  const rest = norm
    .replace(TIME_RE, ' ')
    .replace(RELDAY_RE, ' ')
    .replace(WEEKDAY_RE, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[.:]+|[.:]+$/g, ''))
    .filter((w) => w && !TITLE_STOPWORDS.has(w))
    .join(' ')
    .trim()

  return { at: d.toDate(), rest }
}

const TITLE_STOPWORDS = new Set([
  'на',
  'про',
  'по',
  'поводу',
  'встреча',
  'встречу',
  'встречи',
  'созвон',
  'созвона',
  'митинг',
  'совещание',
])
