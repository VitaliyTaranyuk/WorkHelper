import { useCallback, useRef, useState, type DragEvent } from 'react'

/**
 * Перетаскивание файлов с компьютера в зону (ТП-171). Счётчик dragenter/leave
 * решает мерцание на вложенных элементах; реагируем только на перенос файлов
 * (перетаскивание текста/карточек внутри приложения не подсвечивает зону).
 */
export function useFileDrop(onFiles: (files: FileList) => void) {
  const [isDragOver, setDragOver] = useState(false)
  const depth = useRef(0)

  const hasFiles = (e: DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes('Files')

  const onDragEnter = useCallback((e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth.current += 1
    setDragOver(true)
  }, [])

  const onDragOver = useCallback((e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault() // иначе браузер откроет файл вместо drop-события
  }, [])

  const onDragLeave = useCallback((e: DragEvent) => {
    if (!hasFiles(e)) return
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setDragOver(false)
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current = 0
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files)
    },
    [onFiles],
  )

  return {
    isDragOver,
    dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  }
}
