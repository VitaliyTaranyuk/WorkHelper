/**
 * T-511: человеческие подписи к перечислениям правила.
 *
 * Словарь, а не `Record<RuleLevel, string>` с исчерпывающей проверкой типа:
 * сервер вправе добавить значение аддитивно, и фронтенд обязан деградировать к
 * показу самого значения, а не падать (**W-08**). Именно маппер, бросавший
 * исключение на новом типе задачи, обнулил когда-то целый экран.
 */
const LEVEL: Record<string, string> = {
  CORE: 'Ядро',
  PACK: 'Пак',
  PROFILE: 'Профиль',
}

const KIND: Record<string, string> = {
  PRINCIPLE: 'Принцип',
  GATE: 'Гейт',
  PROCEDURE: 'Процедура',
  PROHIBITION: 'Запрет',
}

const STRENGTH: Record<string, string> = {
  MUST: 'MUST',
  SHOULD: 'SHOULD',
}

const VERIFICATION: Record<string, string> = {
  AUTO: 'авто',
  SEMI: 'полуавто',
  MANUAL: 'ручная',
}

const label = (dict: Record<string, string>, value: string) => dict[value] ?? value

export const levelLabel = (value: string) => label(LEVEL, value)
export const kindLabel = (value: string) => label(KIND, value)
export const strengthLabel = (value: string) => label(STRENGTH, value)
export const verificationLabel = (value: string) => label(VERIFICATION, value)

/** Значения для выпадающих списков формы правила. */
export const LEVEL_OPTIONS = Object.keys(LEVEL)
export const KIND_OPTIONS = Object.keys(KIND)
export const STRENGTH_OPTIONS = Object.keys(STRENGTH)
export const VERIFICATION_OPTIONS = Object.keys(VERIFICATION)
