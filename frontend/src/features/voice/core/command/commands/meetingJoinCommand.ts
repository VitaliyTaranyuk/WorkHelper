import type { VoiceCommand } from '../types'

/**
 * «Подключись к встрече [название]» / «Открой встречу …» (M5, ТП-165).
 * Резолв встречи — в сервисе openMeeting (идущая → ближайшая, по названию);
 * навигация safe: данные не меняются, подтверждение не нужно.
 */
const JOIN_VERB =
  /(подключи(?:сь|ться)|присоедини(?:сь|ться)|открой|войди|зайди|запусти)/iu
const MEETING_NOUN = /(встреч|созвон|митинг|совещани)/iu
/** Срез глагола+предлогов+существительного — остаток считается названием. */
const LEADING =
  /^(?:подключи(?:сь|ться)|присоедини(?:сь|ться)|открой|войди|зайди|запусти)?\s*(?:к|на|во?)?\s*(?:встреч[уеи]?|созвон[уе]?|митинг[уе]?|совещани[юе]?)\s*/iu

export const meetingJoinCommand: VoiceCommand = {
  id: 'meeting.join',
  title: 'Подключиться к встрече',
  description:
    'Открывает идущую или ближайшую встречу со ссылкой (можно уточнить название).',
  examples: ['Подключись к встрече', 'Открой встречу планёрка'],
  riskLevel: 'safe',
  keywords: ['подключись', 'присоединись', 'открой встречу', 'войди во встречу'],
  slots: [
    { name: 'q', description: 'Название встречи (необязательно)', required: false },
  ],

  rule(text) {
    if (!JOIN_VERB.test(text) || !MEETING_NOUN.test(text)) return null
    return { slots: { q: text }, confidence: 0.9 }
  },

  prepare(raw) {
    const text = raw.q ?? raw.content ?? raw.text ?? ''
    const query = text.replace(LEADING, '').trim()
    return {
      ok: true,
      summary: query
        ? `Подключиться к встрече «${query}»`
        : 'Подключиться к ближайшей встрече',
      run: async (context) => {
        const result = await context.openMeeting(query || undefined)
        return { message: result.message }
      },
    }
  },
}
