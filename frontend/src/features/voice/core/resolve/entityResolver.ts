import type {
  VoiceContext,
  VoiceMember,
  VoicePriority,
  VoiceSprint,
  VoiceStatus,
} from '../command/types'
import { normalizeText, wordSimilar } from './textMatch'

/**
 * Детерминированный резолвинг слотов (ТП-93 / F3): человекочитаемое значение →
 * реальная сущность из справочников контекста (ТП-92). НИКОГДА не выдумывает ID:
 * возвращает либо однозначное совпадение, либо список кандидатов для уточнения,
 * либо «не найдено». Это анти-галлюцинационный барьер (ADR-008): резолвер/LLM
 * предлагают значение, но привязка к ID — только по данным WorkTask.
 *
 * Терпим к русской словоизменяемости (склонения имён/слов): сопоставление по
 * префиксу и расстоянию Левенштейна, а не по точному совпадению.
 */

export type ResolveOutcome<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'ambiguous'; candidates: T[] }
  | { kind: 'none' }

function outcome<T>(matches: T[]): ResolveOutcome<T> {
  if (matches.length === 1) return { kind: 'ok', value: matches[0] }
  if (matches.length > 1) return { kind: 'ambiguous', candidates: matches }
  return { kind: 'none' }
}

/** Локальный алиас нормализации (см. textMatch.normalizeText). */
const norm = normalizeText

// --- Участники ---

const MEMBER_STOPWORDS = new Set([
  'на',
  'для',
  'исполнитель',
  'исполнителя',
  'исполнителем',
  'назначь',
  'назначить',
  'поставь',
  'смени',
  'сменить',
  'задачу',
  'задача',
  'ответственн',
])

export function resolveMember(
  raw: string,
  ctx: VoiceContext,
): ResolveOutcome<VoiceMember> {
  const n = norm(raw)
  const tokens = n
    .split(' ')
    .filter((t) => t.length >= 2 && !MEMBER_STOPWORDS.has(t))
  if (tokens.length === 0) return { kind: 'none' }

  const matched = ctx.lookup.members.filter((m) => {
    const name = norm(m.name)
    if (n.includes(name) || name.includes(n)) return true
    const [first = '', last = ''] = name.split(' ')
    const username = m.username ? norm(m.username) : ''
    return tokens.some(
      (t) =>
        wordSimilar(t, first) ||
        wordSimilar(t, last) ||
        (username !== '' && t === username),
    )
  })
  return outcome(matched)
}

// --- Статусы ---

const STATUS_SYNONYMS: Array<{ re: RegExp; codeKey: string }> = [
  { re: /(сделать|туду|to.?do|к выполнению|надо сделать|беклог задач)/, codeKey: 'to do' },
  { re: /(в работ|в процесс|в работу|делаю|progress|начат)/, codeKey: 'progress' },
  { re: /(ревью|на проверк|проверк|review|на согласован)/, codeKey: 'review' },
  { re: /(готов|выполн|сделано|заверш|done|закрыт)/, codeKey: 'done' },
  { re: /(отмен|cancel|отклон)/, codeKey: 'cancel' },
]

export function resolveStatus(
  raw: string,
  ctx: VoiceContext,
): ResolveOutcome<VoiceStatus> {
  const n = norm(raw)
  const matched = new Map<number, VoiceStatus>()

  // 1. Прямое совпадение по коду/подписи статуса проекта.
  for (const s of ctx.lookup.statuses) {
    if (n.includes(norm(s.code)) || n.includes(norm(s.label))) matched.set(s.id, s)
  }
  // 2. Синонимы (русские слова → код-ключ английского кода статуса).
  for (const syn of STATUS_SYNONYMS) {
    if (syn.re.test(n)) {
      for (const s of ctx.lookup.statuses) {
        if (norm(s.code).includes(syn.codeKey)) matched.set(s.id, s)
      }
    }
  }
  return outcome([...matched.values()])
}

// --- Приоритеты ---

const PRIORITY_SYNONYMS: Array<{ re: RegExp; value: string }> = [
  { re: /(высок|срочн|важн|критич|high|приоритетн)/, value: 'HIGH' },
  { re: /(средн|обычн|medium|нормальн)/, value: 'MEDIUM' },
  { re: /(низк|неважн|low|незначительн|потом)/, value: 'LOW' },
]

export function resolvePriority(
  raw: string,
  ctx: VoiceContext,
): ResolveOutcome<VoicePriority> {
  const n = norm(raw)
  const matched = new Map<string, VoicePriority>()

  for (const p of ctx.lookup.priorities) {
    if (n.includes(norm(p.label)) || n.includes(norm(p.value))) matched.set(p.value, p)
  }
  for (const syn of PRIORITY_SYNONYMS) {
    if (syn.re.test(n)) {
      const p = ctx.lookup.priorities.find((x) => x.value === syn.value)
      if (p) matched.set(p.value, p)
    }
  }
  return outcome([...matched.values()])
}

// --- Спринты ---

export function resolveSprint(
  raw: string,
  ctx: VoiceContext,
): ResolveOutcome<VoiceSprint> {
  const n = norm(raw)
  if (/(текущ|активн)/.test(n)) {
    const active = ctx.lookup.sprints.find((s) => s.active)
    return active ? { kind: 'ok', value: active } : { kind: 'none' }
  }
  if (/(бэклог|беклог|backlog|входящ)/.test(n)) {
    const def = ctx.lookup.sprints.find((s) => s.isDefault)
    return def ? { kind: 'ok', value: def } : { kind: 'none' }
  }
  const matched = ctx.lookup.sprints.filter((s) => {
    const name = norm(s.name)
    return name.length > 0 && (n.includes(name) || name.includes(n))
  })
  return outcome(matched)
}

// --- Ссылка на задачу («эту задачу» / код) ---

export type TaskRef =
  | { kind: 'open'; task: { id: string; code: string; title: string } }
  | { kind: 'code'; code: string }

// Код задачи: латинский/кириллический префикс 2-4 симв. + число (ТП-90, WTP 12).
const TASK_CODE_RE = /([a-zа-яё]{2,4})\s*-?\s*(\d{1,6})/i

export function resolveTaskRef(
  raw: string,
  ctx: VoiceContext,
): ResolveOutcome<TaskRef> {
  const codeMatch = TASK_CODE_RE.exec(raw)
  if (codeMatch) {
    const prefix = codeMatch[1].toUpperCase()
    const code = `${prefix}-${codeMatch[2]}`
    return { kind: 'ok', value: { kind: 'code', code } }
  }
  const n = norm(raw)
  if (/(эту|этой|текущ|открыт|данн|это задач)/.test(n)) {
    return ctx.openTask
      ? { kind: 'ok', value: { kind: 'open', task: ctx.openTask } }
      : { kind: 'none' }
  }
  return { kind: 'none' }
}
