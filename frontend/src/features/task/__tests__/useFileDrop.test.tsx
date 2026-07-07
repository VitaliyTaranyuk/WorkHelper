import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useFileDrop } from '../useFileDrop'

/**
 * ТП-171: зона перетаскивания файлов — подсветка только при переносе файлов,
 * счётчик enter/leave без мерцания на вложенных элементах, drop отдаёт файлы.
 */

function Zone({ onFiles }: { onFiles: (f: FileList) => void }) {
  const { isDragOver, dropHandlers } = useFileDrop(onFiles)
  return (
    <div data-testid="zone" {...dropHandlers}>
      {isDragOver ? 'подсвечена' : 'обычная'}
      <span data-testid="inner">вложенный</span>
    </div>
  )
}

const fileTransfer = (files: File[] = []) => ({
  dataTransfer: { types: ['Files'], files },
})

describe('useFileDrop (ТП-171)', () => {
  it('подсвечивается на dragenter с файлами и гаснет на leave', () => {
    render(<Zone onFiles={() => undefined} />)
    const zone = screen.getByTestId('zone')

    fireEvent.dragEnter(zone, fileTransfer())
    expect(zone.textContent).toContain('подсвечена')

    fireEvent.dragLeave(zone, fileTransfer())
    expect(zone.textContent).toContain('обычная')
  })

  it('вложенные enter/leave не гасят подсветку преждевременно', () => {
    render(<Zone onFiles={() => undefined} />)
    const zone = screen.getByTestId('zone')
    const inner = screen.getByTestId('inner')

    fireEvent.dragEnter(zone, fileTransfer())
    fireEvent.dragEnter(inner, fileTransfer()) // depth 2
    fireEvent.dragLeave(inner, fileTransfer()) // depth 1 — ещё подсвечена
    expect(zone.textContent).toContain('подсвечена')
    fireEvent.dragLeave(zone, fileTransfer()) // depth 0
    expect(zone.textContent).toContain('обычная')
  })

  it('drop отдаёт файлы и снимает подсветку', () => {
    const onFiles = vi.fn()
    render(<Zone onFiles={onFiles} />)
    const zone = screen.getByTestId('zone')
    const file = new File(['x'], 'doc.txt', { type: 'text/plain' })

    fireEvent.dragEnter(zone, fileTransfer([file]))
    fireEvent.drop(zone, fileTransfer([file]))

    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(zone.textContent).toContain('обычная')
  })

  it('перетаскивание НЕ файлов (текст/карточки) зону не трогает', () => {
    const onFiles = vi.fn()
    render(<Zone onFiles={onFiles} />)
    const zone = screen.getByTestId('zone')

    fireEvent.dragEnter(zone, { dataTransfer: { types: ['text/plain'], files: [] } })
    expect(zone.textContent).toContain('обычная')
    fireEvent.drop(zone, { dataTransfer: { types: ['text/plain'], files: [] } })
    expect(onFiles).not.toHaveBeenCalled()
  })
})
