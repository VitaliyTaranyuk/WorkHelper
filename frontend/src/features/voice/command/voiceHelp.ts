import { commandRegistry } from '../core/command/commands'

/**
 * Встроенная обучающая подсказка и каталог возможностей (ТП-103/ТП-107).
 * Генерируются ИЗ реестра команд — при добавлении команды каталог/подсказка
 * обновляются автоматически (не дублируют список, ADR-006).
 */
export type VoiceHelpItem = { title: string; examples: string[] }
export type VoiceHelpGroup = { category: string; items: VoiceHelpItem[] }

/** Короткая подсказка «примеры команд» (по одному примеру на команду). */
export function voiceHelpItems(): { title: string; example: string }[] {
  return commandRegistry
    .all()
    .filter((c) => c.examples.length > 0)
    .map((c) => ({ title: c.title, example: c.examples[0] }))
}

// Команда → категория каталога (одно место сопровождения).
const CATEGORY_BY_ID: Record<string, string> = {
  'task.create': 'Создание',
  'task.bug': 'Создание',
  'sprint.create': 'Создание',
  'task.status': 'Изменение задачи',
  'task.priority': 'Изменение задачи',
  'task.sprint': 'Изменение задачи',
  'task.assignee': 'Изменение задачи',
  'task.open': 'Работа с задачами',
  'task.comment': 'Работа с задачами',
  'sprint.activate': 'Спринты',
  'sprint.finish': 'Спринты',
  'meeting.create': 'Календарь и встречи',
  'app.navigate': 'Навигация',
  'notifications.read': 'Уведомления',
}

const CATEGORY_ORDER = [
  'Создание',
  'Изменение задачи',
  'Работа с задачами',
  'Спринты',
  'Календарь и встречи',
  'Навигация',
  'Уведомления',
]

/** Каталог возможностей, сгруппированный по категориям (для справки ТП-107). */
export function voiceHelpCatalog(): VoiceHelpGroup[] {
  const byCategory = new Map<string, VoiceHelpItem[]>()
  for (const command of commandRegistry.all()) {
    if (command.examples.length === 0) continue
    const category = CATEGORY_BY_ID[command.id] ?? 'Прочее'
    const items = byCategory.get(category) ?? []
    items.push({ title: command.title, examples: command.examples })
    byCategory.set(category, items)
  }
  const known = CATEGORY_ORDER.filter((c) => byCategory.has(c))
  const extra = [...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c))
  return [...known, ...extra].map((category) => ({
    category,
    items: byCategory.get(category)!,
  }))
}

/** Шаги первого знакомства (onboarding, ТП-107) — обучение через действие. */
export const VOICE_ONBOARDING_STEPS = [
  {
    title: 'Голосовое управление WorkTask',
    text: 'Управляйте задачами, спринтами и календарём голосом — обычной речью, без запоминания команд.',
  },
  {
    title: 'Как запустить',
    text: 'Нажмите кнопку микрофона внизу справа или клавиши Ctrl+Shift+M. Скажите команду и остановите запись (кнопка «Стоп» или пауза).',
  },
  {
    title: 'Подтверждение',
    text: 'Безопасные действия выполняются сразу. Изменения данных (статус, исполнитель, спринт) и опасные операции (завершение спринта) требуют подтверждения.',
  },
  {
    title: 'Отмена',
    text: 'Кнопка-история (часы) рядом с микрофоном хранит журнал команд сессии — поддерживаемые действия можно отменить.',
  },
  {
    title: 'Если не понял',
    text: 'Система переспросит и покажет примеры. Она ничего не выдумывает — использует только то, что вы сказали, и данные проекта.',
  },
] as const

/** Советы по эффективному использованию (справочный раздел ТП-107/ТП-110). */
export const VOICE_TIPS = [
  'Говорите естественно — точную команду запоминать не нужно; система переспросит, если не поняла.',
  'Ссылайтесь на открытую задачу словами «эту задачу» или называйте её код («ТП-90»).',
  'Опасные действия подтверждайте; последнее действие можно отменить в журнале (кнопка-история).',
  'Для быстрого старта используйте горячую клавишу — руки не отрываются от клавиатуры.',
] as const

/** Ограничения текущей версии (для справки ТП-107). */
export const VOICE_LIMITATIONS = [
  'Работает в Chrome/Edge/Safari (нужен доступ к микрофону); в Firefox распознавание речи недоступно.',
  'Открытая задача определяется по странице задачи (не по модальному окну поверх доски).',
  'Свободные формулировки распознаются эвристикой (с подтверждением); полноценный ИИ подключается позже.',
  'Даты встреч — относительные (сегодня/завтра, дни недели) и время; абсолютные даты пока не распознаются.',
] as const
