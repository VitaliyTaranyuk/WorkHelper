import type { User } from './types'

type UserNameSource = {
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  email?: string | null
}

/**
 * Единая утилита отображаемого имени пользователя для всего UI.
 *
 * Защищает от undefined / null / пустых строк / висящих пробелов / битых символов:
 *   1. displayName, если задан и непустой;
 *   2. иначе lastName + firstName (только непустые, обрезанные);
 *   3. иначе email до @ (как fallback, чтобы хоть что-то показать);
 *   4. иначе локализованный плейсхолдер "Без имени".
 *
 * Возвращает гарантированно непустую строку — никаких "undefined", "null",
 * "Иванов " с пустым именем или "?? Иванов".
 */
export function formatUserName(user: UserNameSource | null | undefined): string {
  if (!user) return 'Без имени'

  const display = (user.displayName ?? '').trim()
  if (display) return display

  const last = (user.lastName ?? '').trim()
  const first = (user.firstName ?? '').trim()
  const composed = [last, first].filter(Boolean).join(' ')
  if (composed) return composed

  const email = (user.email ?? '').trim()
  if (email) return email.split('@')[0] || email

  return 'Без имени'
}

/**
 * Инициалы для аватара (1–2 символа). Защищён от пустых имён.
 *
 * ТП-106: приоритет — СТРУКТУРНЫЕ имя+фамилия (они есть во ВСЕХ представлениях
 * пользователя: self / creator / assignee), а `displayName` — только у себя.
 * Раньше displayName был первым → тот же пользователь показывался «AD» в шапке
 * (по displayName) и «CC» в карточке (по firstName/lastName). Теперь везде
 * одинаково. displayName/email — запасной вариант, если имён нет.
 */
export function getUserInitials(user: UserNameSource | null | undefined): string {
  if (!user) return '?'

  const last = (user.lastName ?? '').trim()
  const first = (user.firstName ?? '').trim()
  if (last && first) return (last[0] + first[0]).toUpperCase()
  if (last) return last.slice(0, 2).toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()

  const display = (user.displayName ?? '').trim()
  if (display) {
    const parts = display.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  }

  const email = (user.email ?? '').trim()
  if (email) return email.slice(0, 2).toUpperCase()

  return '?'
}

/** Обратная совместимость с прежним API: getFullName использует formatUserName. */
export function getFullName(user: Pick<User, 'lastName' | 'firstName'>) {
  return formatUserName(user)
}
