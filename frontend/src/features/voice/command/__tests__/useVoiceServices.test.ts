import { describe, it, expect } from 'vitest'
import { voiceNavPath } from '../useVoiceServices'

describe('voiceNavPath', () => {
  it('board → /main', () => {
    expect(voiceNavPath({ kind: 'board' }, 'p1')).toEqual({ to: '/main' })
  })

  it('tasks → backlog проекта', () => {
    expect(voiceNavPath({ kind: 'tasks' }, 'p1')).toEqual({
      to: '/project/$projectId/backlog',
      params: { projectId: 'p1' },
    })
  })

  it('calendar → calendar проекта', () => {
    expect(voiceNavPath({ kind: 'calendar' }, 'p1')).toEqual({
      to: '/project/$projectId/calendar',
      params: { projectId: 'p1' },
    })
  })

  it('settings → /settings', () => {
    expect(voiceNavPath({ kind: 'settings' }, 'p1')).toEqual({ to: '/settings' })
  })

  it('task → /task/$code', () => {
    expect(voiceNavPath({ kind: 'task', code: 'ТП-90' }, 'p1')).toEqual({
      to: '/task/$code',
      params: { code: 'ТП-90' },
    })
  })
})
