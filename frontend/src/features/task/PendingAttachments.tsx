import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import { notify as toast } from '@/shared/ui/notify'
import { LightboxDialog } from './ImageLightbox'
import { isBrowserViewable } from './useTaskAttachments'
import { useFileDrop } from './useFileDrop'

/** Открыть локальный файл формы создания в новой вкладке (object URL). */
function openFileInNewTab(file: File) {
  const url = URL.createObjectURL(file)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!win) toast.error('Браузер заблокировал открытие вкладки')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

type Props = {
  files: File[]
  onChange: (files: File[]) => void
}

const MAX_FILE_SIZE = 25 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Вложения в форме создания задачи (ТП-30): файлы копятся локально
 * (с диска, перетаскиванием, из буфера Ctrl+V) и загружаются к задаче
 * сразу после её создания. Паттерн Jira/Linear: карточки ещё нет,
 * но вложения уже можно приложить.
 */
export function PendingAttachments({ files, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement | null>(null)
  // ТП-53: клик по превью изображения открывает встроенный лайтбокс
  const [preview, setPreview] = useState<File | null>(null)
  const previewUrl = useMemo(
    () => (preview ? URL.createObjectURL(preview) : null),
    [preview],
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return
      const next = [...files]
      for (const f of Array.from(incoming)) {
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`«${f.name}» больше 25 MB — пропущен`)
          continue
        }
        // дубликаты (одно имя и размер) не добавляем повторно
        if (next.some((x) => x.name === f.name && x.size === f.size)) continue
        next.push(f)
      }
      if (next.length !== files.length) onChange(next)
      if (fileInput.current) fileInput.current.value = ''
    },
    [files, onChange],
  )

  // Ctrl+V: вставка файлов/скриншотов из буфера, пока открыта форма создания.
  // Обычная вставка текста (clipboardData.files пуст) не затрагивается.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.files
      if (!pasted || pasted.length === 0) return
      e.preventDefault()
      const named = Array.from(pasted).map((f, i) => {
        if (f.name && f.name !== 'image.png') return f
        const ext = f.type.split('/')[1] || 'png'
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        return new File([f], `paste-${stamp}${i > 0 ? `-${i}` : ''}.${ext}`, {
          type: f.type,
        })
      })
      addFiles(named)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [addFiles])

  const removeAt = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx))
  }

  // ТП-171: единый хук перетаскивания (как в карточке задачи) — с подсветкой
  // зоны вместо прежних «немых» inline-обработчиков.
  const { isDragOver, dropHandlers } = useFileDrop((dropped) => addFiles(dropped))

  return (
    <Stack
      gap={1}
      {...dropHandlers}
      sx={{
        position: 'relative',
        borderRadius: 2,
        outline: isDragOver ? '2px dashed var(--wt-accent)' : '2px dashed transparent',
        outlineOffset: 4,
        transition: 'outline-color 120ms ease',
      }}
    >
      {isDragOver && (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            position: 'absolute',
            inset: -4,
            zIndex: 1,
            borderRadius: 2,
            backgroundColor: 'var(--wt-accent-soft)',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="subtitle2" sx={{ color: 'var(--wt-accent)' }}>
            Отпустите файлы, чтобы прикрепить
          </Typography>
        </Stack>
      )}
      <Stack direction="row" alignItems="center" gap={1}>
        <AttachFileIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle2">Вложения</Typography>
        <Typography variant="caption" color="text.secondary">
          ({files.length})
        </Typography>
        <Stack direction="row" gap={1} sx={{ ml: 'auto' }}>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => fileInput.current?.click()}
            sx={{ textTransform: 'none' }}
          >
            Добавить файл
          </Button>
        </Stack>
      </Stack>

      {files.length === 0 && (
        <Typography variant="caption" color="text.disabled">
          Перетащите файлы сюда, вставьте изображение из буфера (Ctrl+V) или
          добавьте кнопкой. Файлы будут загружены к задаче после создания.
          Лимит — 25 MB на файл.
        </Typography>
      )}

      <Stack gap={0.5} sx={{ maxHeight: 200, overflowY: 'auto', pr: 0.5 }}>
        {files.map((f, idx) => (
          <PendingFileRow
            key={`${f.name}-${f.size}-${idx}`}
            file={f}
            onRemove={() => removeAt(idx)}
            onPreview={() => setPreview(f)}
          />
        ))}
      </Stack>

      <LightboxDialog
        open={preview !== null}
        src={previewUrl}
        fileName={preview?.name}
        onClose={() => setPreview(null)}
      />
    </Stack>
  )
}

function PendingFileRow({
  file,
  onRemove,
  onPreview,
}: {
  file: File
  onRemove: () => void
  onPreview: () => void
}) {
  const isImage = (file.type || '').toLowerCase().startsWith('image/')
  const viewable = isBrowserViewable(file.type)
  // object URL для превью изображения; освобождаем при смене файла/unmount
  const previewUrl = useMemo(
    () => (isImage ? URL.createObjectURL(file) : null),
    [file, isImage],
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      sx={{
        p: '6px 8px',
        borderRadius: 1,
        backgroundColor: 'var(--wt-surface-muted)',
        '&:hover': { backgroundColor: 'var(--wt-surface-hover)' },
      }}
    >
      {previewUrl ? (
        <button
          type="button"
          onClick={onPreview}
          title={`${file.name} — открыть просмотр`}
          style={{
            display: 'flex',
            flexShrink: 0,
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'zoom-in',
          }}
        >
          <img
            src={previewUrl}
            alt={file.name}
            width={36}
            height={36}
            style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }}
          />
        </button>
      ) : isImage ? (
        <ImageOutlinedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
      ) : (
        <InsertDriveFileOutlinedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
      )}
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        {/* ТП-53: просматриваемые типы открываются в новой вкладке по имени файла */}
        <Typography
          variant="body2"
          noWrap
          title={viewable ? `${file.name} — открыть в новой вкладке` : file.name}
          onClick={viewable ? () => openFileInNewTab(file) : undefined}
          sx={{
            fontWeight: 500,
            ...(viewable && {
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' },
            }),
          }}
        >
          {file.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {formatSize(file.size)} · будет загружен после создания
        </Typography>
      </Stack>
      <Tooltip title="Убрать из списка">
        <IconButton size="small" color="error" onClick={onRemove} sx={{ flexShrink: 0 }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
