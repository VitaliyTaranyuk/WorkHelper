import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import { notify as toast } from '@/shared/ui/notify'
import {
  downloadAttachment,
  isBrowserViewable,
  openAttachmentInNewTab,
  useAttachmentBlobUrl,
  useDeleteAttachment,
  useTaskAttachments,
  useUploadAttachment,
  type AttachmentDto,
} from './useTaskAttachments'
import { ImageLightbox } from './ImageLightbox'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import { formatDateDDMMYYYY } from '@/shared/utils/date'

type Props = { projectId: string; taskId: string }

const MAX_FILE_SIZE = 25 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isImage(att: AttachmentDto) {
  return (att.contentType || '').toLowerCase().startsWith('image/')
}

/**
 * Блок вложений в карточке задачи (паттерн Jira/ClickUp):
 *  - компактный список со значками типа файла;
 *  - превью для картинок (thumbnail, загружается авторизованным запросом);
 *  - клик по превью открывает встроенный просмотр (ImageLightbox);
 *  - вставка изображений из буфера обмена (Ctrl+V) при открытой карточке;
 *  - действия: скачать / удалить.
 */
export function TaskAttachments({ projectId, taskId }: Props) {
  const { data: attachments, isLoading } = useTaskAttachments({ projectId, taskId })
  const upload = useUploadAttachment({ projectId, taskId })
  const del = useDeleteAttachment({ projectId, taskId })
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<AttachmentDto | null>(null)

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return
      for (const f of Array.from(files)) {
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`«${f.name}» больше 25 MB — пропущен`)
          continue
        }
        try {
          await upload.mutateAsync(f)
        } catch (err) {
          toast.error(extractGeneralError(err) ?? `Не удалось загрузить «${f.name}»`)
        }
      }
      if (fileInput.current) fileInput.current.value = ''
    },
    [upload],
  )

  // Ctrl+V: вставка изображений/файлов из буфера обмена, пока открыта карточка.
  // Обрабатываем только вставку файлов — обычная вставка текста в поля
  // (clipboardData.files пуст) не затрагивается.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files
      if (!files || files.length === 0) return
      e.preventDefault()
      const named = Array.from(files).map((f, i) => {
        // скриншоты из буфера приходят как "image.png" — даём уникальное имя
        if (f.name && f.name !== 'image.png') return f
        const ext = f.type.split('/')[1] || 'png'
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        return new File([f], `paste-${stamp}${i > 0 ? `-${i}` : ''}.${ext}`, {
          type: f.type,
        })
      })
      void handleFiles(named)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [handleFiles])

  const remove = async (att: AttachmentDto) => {
    if (!window.confirm(`Удалить «${att.fileName}»?`)) return
    await del.mutateAsync(att.id)
  }

  const download = async (att: AttachmentDto) => {
    try {
      await downloadAttachment(projectId, taskId, att)
    } catch {
      toast.error(`Не удалось скачать «${att.fileName}»`)
    }
  }

  return (
    <Stack gap={1}>
      <Stack direction="row" alignItems="center" gap={1}>
        <AttachFileIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle2">Вложения</Typography>
        <Typography variant="caption" color="text.secondary">
          ({attachments?.length ?? 0})
        </Typography>
        <Stack direction="row" gap={1} sx={{ ml: 'auto' }}>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
            sx={{ textTransform: 'none' }}
          >
            {upload.isPending ? 'Загрузка…' : 'Добавить файл'}
          </Button>
        </Stack>
      </Stack>

      {isLoading && (
        <Typography variant="caption" color="text.secondary">
          Загрузка вложений…
        </Typography>
      )}

      {/* ТП-73: компактное пустое состояние — одна строка вместо блока текста;
          способ добавления уже виден по кнопке в заголовке. */}
      {!isLoading && (!attachments || attachments.length === 0) && (
        <Typography variant="caption" color="text.disabled">
          Нет вложений — добавьте файл или вставьте из буфера (Ctrl+V)
        </Typography>
      )}

      <Stack
        gap={0.5}
        sx={{
          maxHeight: 240,
          overflowY: 'auto',
          pr: 0.5,
        }}
      >
        {(attachments ?? []).map((att) => (
          <Stack
            key={att.id}
            direction="row"
            alignItems="center"
            gap={1}
            sx={{
              p: '6px 8px',
              borderRadius: 1,
              backgroundColor: 'rgba(246, 246, 246, .6)',
              '&:hover': { backgroundColor: 'rgba(246, 246, 246, .9)' },
            }}
          >
            {isImage(att) ? (
              <AttachmentThumbnail
                projectId={projectId}
                taskId={taskId}
                attachment={att}
                onClick={() => setPreview(att)}
              />
            ) : (
              <InsertDriveFileOutlinedIcon
                sx={{ color: 'text.secondary', flexShrink: 0 }}
              />
            )}
            <Stack sx={{ minWidth: 0, flex: 1 }}>
              {/* ТП-53: просматриваемые браузером типы (текст/картинка/PDF)
                  открываются в новой вкладке кликом по имени файла */}
              <Typography
                variant="body2"
                noWrap
                title={
                  isBrowserViewable(att.contentType)
                    ? `${att.fileName} — открыть в новой вкладке`
                    : att.fileName
                }
                onClick={
                  isBrowserViewable(att.contentType)
                    ? () => void openAttachmentInNewTab(projectId, taskId, att)
                    : undefined
                }
                sx={{
                  fontWeight: 500,
                  ...(isBrowserViewable(att.contentType) && {
                    cursor: 'pointer',
                    color: 'primary.main',
                    '&:hover': { textDecoration: 'underline' },
                  }),
                }}
              >
                {att.fileName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {formatSize(att.sizeBytes)} ·{' '}
                {formatDateDDMMYYYY(att.uploadedAt)}
                {att.uploadedByName ? ` · ${att.uploadedByName}` : ''}
              </Typography>
            </Stack>
            <Stack direction="row" sx={{ flexShrink: 0 }}>
              <Tooltip title="Скачать">
                <IconButton size="small" onClick={() => download(att)}>
                  <DownloadOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => remove(att)}
                  disabled={del.isPending}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        ))}
      </Stack>

      <ImageLightbox
        projectId={projectId}
        taskId={taskId}
        attachment={preview}
        onClose={() => setPreview(null)}
      />
    </Stack>
  )
}

/** Превью изображения: содержимое подгружается авторизованным запросом (blob). */
function AttachmentThumbnail({
  projectId,
  taskId,
  attachment,
  onClick,
}: {
  projectId: string
  taskId: string
  attachment: AttachmentDto
  onClick: () => void
}) {
  const { data: blobUrl } = useAttachmentBlobUrl({
    projectId,
    taskId,
    attachmentId: attachment.id,
  })

  if (!blobUrl) {
    return <ImageOutlinedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${attachment.fileName} — открыть просмотр`}
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
        src={blobUrl}
        alt={attachment.fileName}
        width={36}
        height={36}
        style={{
          objectFit: 'cover',
          borderRadius: 4,
          display: 'block',
        }}
      />
    </button>
  )
}
