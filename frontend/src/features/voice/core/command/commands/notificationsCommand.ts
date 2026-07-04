import type { VoiceCommand } from '../types'

/**
 * Команда «отметить уведомления прочитанными» (ТП-101 / C5). Через markAllRead.
 * safe — действие обратимо по восприятию и не разрушает данные.
 */
export const notificationsReadCommand: VoiceCommand = {
  id: 'notifications.read',
  title: 'Прочитать уведомления',
  description: 'Отмечает все уведомления прочитанными.',
  examples: ['Отметь уведомления прочитанными', 'Прочитай все уведомления'],
  riskLevel: 'safe',
  keywords: ['уведомления', 'уведомлений', 'нотификации'],
  slots: [],

  rule(text) {
    const t = text.toLowerCase()
    if (!/(уведомл|нотификац)/iu.test(t)) return null
    if (!/(прочит|отмет|очист)/iu.test(t)) return null
    return { slots: {}, confidence: 0.92 }
  },

  prepare() {
    return {
      ok: true,
      summary: 'Отметить все уведомления прочитанными',
      run: async (context) => {
        await context.markNotificationsRead()
        return { message: 'Уведомления отмечены прочитанными' }
      },
    }
  },
}
