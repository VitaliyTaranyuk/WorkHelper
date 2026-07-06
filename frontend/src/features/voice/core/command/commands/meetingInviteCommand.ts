import { resolveMember } from '../../resolve/entityResolver'
import type { VoiceCommand } from '../types'

/**
 * «Пригласи Петрова на встречу [планёрка]» (M5, ТП-165). Участник резолвится
 * по составу проекта (те же правила, что у исполнителя задач); встреча —
 * идущая/ближайшая или по названию (сервис inviteToMeeting → существующая
 * мутация updateMeeting). confirm: меняются данные встречи.
 */
const INVITE_VERB = /(пригласи(?:ть)?|позови|добавь)/iu
const MEETING_PART = /(?:на|во?)\s+(?:встреч[уе]|созвон|митинг|совещание)/iu

export const meetingInviteCommand: VoiceCommand = {
  id: 'meeting.invite',
  title: 'Пригласить на встречу',
  description:
    'Добавляет участника проекта во встречу (идущую, ближайшую или по названию).',
  examples: [
    'Пригласи Петрова на встречу',
    'Добавь Ивана на созвон планёрка',
  ],
  riskLevel: 'confirm',
  keywords: ['пригласи', 'позови', 'добавь на встречу'],
  slots: [
    { name: 'person', description: 'Кого пригласить', required: true },
    { name: 'meeting', description: 'Название встречи (необязательно)', required: false },
  ],

  rule(text) {
    if (!INVITE_VERB.test(text) || !MEETING_PART.test(text)) return null
    const match = text.match(MEETING_PART)!
    const before = text.slice(0, match.index).replace(INVITE_VERB, '').trim()
    const after = text
      .slice((match.index ?? 0) + match[0].length)
      .trim()
    return {
      slots: { person: before, ...(after ? { meeting: after } : {}) },
      confidence: 0.9,
    }
  },

  prepare(raw, ctx) {
    const person = (raw.person ?? '').trim()
    const meetingQuery = (raw.meeting ?? '').trim()
    if (!person)
      return {
        ok: false,
        clarification: 'Кого пригласить? Например: «Пригласи Петрова на встречу».',
      }
    const resolved = resolveMember(person, ctx)
    if (resolved.kind === 'none')
      return {
        ok: false,
        clarification: `Не нашёл участника «${person}» в проекте.`,
      }
    if (resolved.kind === 'ambiguous')
      return {
        ok: false,
        clarification: `Уточните, кого пригласить: ${resolved.candidates
          .map((c) => c.name)
          .join(', ')}.`,
      }
    const member = resolved.value
    return {
      ok: true,
      summary: meetingQuery
        ? `Пригласить ${member.name} на встречу «${meetingQuery}»`
        : `Пригласить ${member.name} на ближайшую встречу`,
      run: async (context) => {
        const result = await context.inviteToMeeting(
          { id: member.id, name: member.name },
          meetingQuery || undefined,
        )
        return { message: result.message }
      },
    }
  },
}
