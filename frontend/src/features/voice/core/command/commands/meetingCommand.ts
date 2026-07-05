import dayjs from 'dayjs'
import { parseRussianDateTime } from '../../nlp/dateTime'
import { capitalizeFirst } from '../../../textUtils'
import type { VoiceCommand } from '../types'

/**
 * Команда «создай встречу … <дата/время>» (ТП-104). Разбирает русские
 * относительные даты/время локально (без AI, dateTime.ts) и создаёт встречу
 * через существующую мутацию createMeeting. confirm — подтверждение с «зачиткой»
 * даты/времени (защита от ошибки распознавания перед созданием).
 */
const TITLE_MIN = 2
const DEFAULT_DURATION_MIN = 60

const MEETING_VERB =
  /(созда(?:й|ть)|назнач(?:ь|ить)|запланир(?:уй|овать)|организуй|поставь)/iu
const MEETING_NOUN = /(встреч|созвон|митинг|совещани)/iu
const LEADING_VERB =
  /^(?:созда(?:й|ть)|назнач(?:ь|ить)|запланир(?:уй|овать)|организуй|поставь)\s*/iu

export const meetingCommand: VoiceCommand = {
  id: 'meeting.create',
  title: 'Создать встречу',
  description:
    'Создаёт встречу в календаре с названием, датой и временем (напр. «завтра в 15»).',
  examples: [
    'Создай встречу обсуждение спринта завтра в 15',
    'Назначь созвон по релизу в пятницу в 10 утра',
  ],
  riskLevel: 'confirm',
  keywords: ['встреча', 'встречу', 'созвон', 'митинг', 'совещание', 'назначь', 'запланируй'],
  slots: [{ name: 'q', description: 'Название и дата/время встречи', required: true }],

  rule(text) {
    if (!MEETING_VERB.test(text) || !MEETING_NOUN.test(text)) return null
    return { slots: { q: text }, confidence: 0.9 }
  },

  prepare(raw) {
    const text = raw.q ?? raw.content ?? raw.text ?? ''
    const { at, rest } = parseRussianDateTime(text)
    const title = capitalizeFirst(rest.replace(LEADING_VERB, '').trim())

    if (!at) {
      return {
        ok: false,
        clarification: 'Когда встреча? Скажите дату и время, например: «завтра в 15».',
      }
    }
    if (title.length < TITLE_MIN) {
      return {
        ok: false,
        clarification: 'Как назвать встречу? Например: «Создай встречу планёрка завтра в 10».',
      }
    }

    const when = dayjs(at)
    const summary = `Создать встречу «${title}» — ${when.format('DD.MM в HH:mm')}`
    return {
      ok: true,
      summary,
      run: async (context) => {
        await context.createMeeting({
          title,
          startAt: when.toDate().toISOString(),
          endAt: when.add(DEFAULT_DURATION_MIN, 'minute').toDate().toISOString(),
        })
        return { message: `Встреча «${title}» создана на ${when.format('DD.MM в HH:mm')}` }
      },
    }
  },
}
