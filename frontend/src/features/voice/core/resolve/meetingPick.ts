import { normalizeText, wordSimilar } from './textMatch'
import type { MeetingDto } from '@/shared/api/endpoint/meetingsApi'

/**
 * Выбор встречи для голосовых команд (M5): «подключись к встрече [планёрка]»,
 * «пригласи Ивана на встречу». Чистая функция — тестируется без сети.
 *
 * Правила: идущая сейчас важнее предстоящей; предстоящая — ближайшая;
 * прошедшие не предлагаются (кроме случая, когда название дало единственный
 * точный матч — пользователь явно её назвал).
 */
const DEFAULT_DURATION_MS = 60 * 60 * 1000
/** Слова запроса, не несущие название («подключись к встрече планёрка»). */
const QUERY_STOPWORDS = new Set([
  'встреча',
  'встречу',
  'встрече',
  'созвон',
  'созвону',
  'митинг',
  'митингу',
  'совещание',
  'совещанию',
])

function titleMatches(title: string, query: string): boolean {
  const t = normalizeText(title)
  const q = normalizeText(query)
  if (q.length === 0) return true
  if (t.includes(q)) return true
  const queryTokens = q.split(' ').filter((w) => !QUERY_STOPWORDS.has(w))
  if (queryTokens.length === 0) return true
  const titleTokens = t.split(' ')
  return queryTokens.every((qt) => titleTokens.some((tt) => wordSimilar(qt, tt)))
}

function endOf(meeting: MeetingDto): number {
  if (meeting.endAt) return +new Date(meeting.endAt)
  return +new Date(meeting.startAt) + DEFAULT_DURATION_MS
}

export function pickMeeting(
  meetings: MeetingDto[],
  query: string | undefined,
  nowMs: number,
  options?: { requireLink?: boolean },
): MeetingDto | null {
  const candidates = meetings.filter(
    (m) =>
      (!options?.requireLink || !!m.link) &&
      titleMatches(m.title, query ?? ''),
  )
  if (candidates.length === 0) return null

  const ongoing = candidates
    .filter((m) => +new Date(m.startAt) <= nowMs && nowMs <= endOf(m))
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
  if (ongoing.length > 0) return ongoing[0]!

  const upcoming = candidates
    .filter((m) => +new Date(m.startAt) > nowMs)
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
  if (upcoming.length > 0) return upcoming[0]!

  // Всё в прошлом: берём только при явном названии с единственным матчем
  if (query && normalizeText(query).length > 0 && candidates.length === 1)
    return candidates[0]!
  return null
}
