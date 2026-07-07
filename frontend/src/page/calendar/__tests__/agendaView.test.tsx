import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgendaView } from '../AgendaView'
import type { MeetingDto } from '@/shared/api/endpoint/meetingsApi'

/**
 * ТП-186 ST-3: «Ближайшие встречи» — хронологический список предстоящего,
 * группировка Сегодня/Завтра, прошедшее скрыто, клик открывает запись.
 */
function meeting(id: string, startAt: string, over: Partial<MeetingDto> = {}): MeetingDto {
  return {
    id,
    title: `Встреча ${id}`,
    startAt,
    participants: [],
    ...over,
  } as MeetingDto
}

describe('AgendaView (ТП-186 ST-3)', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-07-07T09:00:00')))
  afterEach(() => vi.useRealTimers())

  it('показывает предстоящие, группирует Сегодня/Завтра, скрывает прошедшее', () => {
    const meetings = [
      meeting('past', '2026-07-06T10:00:00'),
      meeting('today', '2026-07-07T15:00:00'),
      meeting('tomorrow', '2026-07-08T11:00:00'),
    ]
    render(<AgendaView meetings={meetings} onSelect={() => {}} />)

    expect(screen.getByText('Сегодня')).toBeInTheDocument()
    expect(screen.getByText('Завтра')).toBeInTheDocument()
    expect(screen.getByText('Встреча today')).toBeInTheDocument()
    expect(screen.getByText('Встреча tomorrow')).toBeInTheDocument()
    // прошедшая встреча не показывается
    expect(screen.queryByText('Встреча past')).not.toBeInTheDocument()
  })

  it('пустое состояние, когда предстоящих встреч нет', () => {
    render(<AgendaView meetings={[]} onSelect={() => {}} />)
    expect(screen.getByText('Ближайших встреч нет')).toBeInTheDocument()
  })

  it('клик по встрече вызывает onSelect', () => {
    const onSelect = vi.fn()
    render(
      <AgendaView
        meetings={[meeting('m1', '2026-07-07T15:00:00')]}
        onSelect={onSelect}
      />,
    )
    fireEvent.click(screen.getByText('Встреча m1'))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1' }),
    )
  })
})
