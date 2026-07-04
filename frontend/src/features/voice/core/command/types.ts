/**
 * Контракты командного режима голоса (ТП-91 / F1).
 *
 * Эволюция удалённого реестра ТП-22/57 (см. `.ai/VOICE_ARCHITECTURE.md`, §2):
 * реестр/дескриптор/контекст переиспользуются, но распределённый `match()`
 * убран — распознавание намерения централизуется в IntentResolver (ТП-94),
 * а команда получает уже готовые слоты.
 *
 * Ключевое решение: `VoiceCommand` НЕ параметризован типом слотов. Метод
 * `prepare()` инкапсулирует разбор/резолвинг слотов и возвращает замыкание
 * `run`, захватывающее уже типизированные слоты. Это убирает проблему
 * вариантности при хранении разнородных команд в реестре (без `any`) и
 * разделяет чистую подготовку (тестируемо), исполнение (побочные эффекты) и
 * подтверждение (UI, ТП-95).
 */

/** Поле-цель диктовки (совместимость с ТП-88). */
export type VoiceField = 'title' | 'description' | 'comment'

/** Уровень риска действия — задаёт поведение ConfirmationGate (ТП-95). */
export type RiskLevel = 'safe' | 'confirm' | 'destructive'

// --- Снимок контекста (наполняется в ТП-92 / F2) ---

export type VoiceMember = { id: string; name: string; username?: string }
export type VoiceStatus = { id: number; code: string; label: string }
export type VoiceSprint = {
  id: string
  name: string
  active: boolean
  isDefault: boolean
}
export type VoicePriority = { value: string; label: string }

/** Только уже закэшированные данные (кэши TanStack Query + маршрут). */
export type VoiceContext = {
  projectId: string
  activeSprintId?: string
  /** Спринт по умолчанию (Backlog) — «входящие» для новых сущностей. */
  defaultSprintId: string
  /** Открытая сейчас задача (из параметров маршрута) — для «эту задачу». */
  openTask?: { id: string; code: string; title: string }
  currentUserId: string
  lookup: {
    members: VoiceMember[]
    statuses: VoiceStatus[]
    sprints: VoiceSprint[]
    priorities: VoicePriority[]
  }
}

// --- Действия (сервисы), инъецируемые командам (проводятся в ТП-95 / X1) ---

/** Раздел приложения для навигации. Маппится на router.navigate в X1. */
export type NavTarget =
  | { kind: 'board' }
  | { kind: 'tasks' }
  | { kind: 'calendar' }
  | { kind: 'settings' }
  | { kind: 'task'; code: string }

export type VoiceCreateTaskInput = {
  title: string
  description?: string
  taskType: 'TASK' | 'BUG'
  priority?: string
  sprintId?: string
  statusId?: number
  assignee?: string
}

export type CreatedTask = { id: string; code: string; title: string }

/**
 * Сервисы приложения, доступные командам при исполнении. Каждый делегирует
 * СУЩЕСТВУЮЩЕЙ мутации/хуку (инвариант: голос не ходит в API в обход UI-слоя).
 * Набор расширяется аддитивно по мере добавления доменов команд (C1..C6).
 */
export type VoiceServices = {
  createTask(input: VoiceCreateTaskInput): Promise<CreatedTask>
  navigate(target: NavTarget): void
}

/** Контекст исполнения = данные + сервисы. */
export type VoiceCommandContext = VoiceContext & VoiceServices

// --- Дескриптор команды ---

/** Описание слота для схемы резолвера (ТП-94: правила/LLM). */
export type SlotSpec = {
  name: string
  description: string
  required?: boolean
  examples?: string[]
}

/** Результат обратной связи пользователю после исполнения команды. */
export type VoiceCommandResult = {
  message: string
  /** Код созданной/затронутой задачи — для перехода к карточке. */
  taskCode?: string
  /** Откат действия, если поддерживается (ТП-103 / X2). */
  undo?: () => Promise<void>
}

/**
 * Итог `prepare()`: либо готовое к исполнению замыкание `run` с человекочитаемым
 * `summary` (для карточки подтверждения / «зачитки»), либо уточняющий вопрос
 * при неоднозначности/нехватке данных (команда НИЧЕГО не выдумывает).
 */
export type PrepareResult =
  | {
      ok: true
      summary: string
      run: (ctx: VoiceCommandContext) => Promise<VoiceCommandResult>
    }
  | { ok: false; clarification: string }

export interface VoiceCommand {
  /** Уникальный идентификатор (домен.действие), напр. `task.create`. */
  id: string
  /** Человеко-читаемое название. */
  title: string
  /** Описание для схемы резолвера. */
  description: string
  /** Примеры фраз (few-shot для правил и LLM). */
  examples: string[]
  /** Класс риска — управляет подтверждением. */
  riskLevel: RiskLevel
  /** Спецификация слотов для резолвера. */
  slots: SlotSpec[]
  /** Разбор/резолвинг слотов → замыкание `run` или уточнение. Без побочных эффектов. */
  prepare(raw: Record<string, string>, ctx: VoiceContext): PrepareResult
}

/** Схема команды для передачи резолверу (ТП-94). Сериализуема. */
export type CommandSchema = Array<{
  id: string
  title: string
  description: string
  examples: string[]
  riskLevel: RiskLevel
  slots: SlotSpec[]
}>

/**
 * Результат распознавания намерения (ТП-94, DTO фронт↔бэк). `commandId === null`
 * — намерение не распознано.
 */
export type IntentResolution = {
  commandId: string | null
  slots: Record<string, string>
  confidence: number
  clarification?: string
}
