import { useRef } from 'react'
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import { toast } from 'sonner'
import {
  attachmentDownloadUrl,
  useDeleteAttachment,
  useTaskAttachments,
  useUploadAttachment,
  type AttachmentDto,
} from './useTaskAttachments'
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
 *  - превью для картинок (thumbnail);
 *  - действия: скачать / скопировать ссылку / удалить;
 *  - кнопка загрузки и drop-zone (paste/drop-эффекта пока нет — keep simple).
 */
export function TaskAttachments({ projectId, taskId }: Props) {
  const { data: attachments, isLoading } = useTaskAttachments({ projectId, taskId })
  const upload = useUploadAttachment({ projectId, taskId })
  const del = useDeleteAttachment({ projectId, taskId })
  const fileInput = useRef<HTMLInputElement | null>(null)

  const handleFiles = async (files: FileList | null) => {
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
  }

  const copyLink = async (att: AttachmentDto) => {
    const url = attachmentDownloadUrl(projectId, taskId, att.id)
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Ссылка скопирована')
    } catch {
      toast.error('Не удалось скопировать ссылку')
    }
  }

  const remove = async (att: AttachmentDto) => {
    if (!window.confirm(`Удалить «${att.fileName}»?`)) return
    await del.mutateAsync(att.id)
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

      {!isLoading && (!attachments || attachments.length === 0) && (
        <Typography variant="caption" color="text.disabled">
          Нет вложений. Лимит — 25 MB на файл.
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
        {(attachments ?? []).map((att) => {
          const url = attachmentDownloadUrl(projectId, taskId, att.id)
          return (
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
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={att.fileName}
                  style={{ display: 'flex', flexShrink: 0 }}
                >
                  <img
                    src={url}
                    alt={att.fileName}
                    width={36}
                    height={36}
                    style={{
                      objectFit: 'cover',
                      borderRadius: 4,
                      display: 'block',
                    }}
                  />
                </a>
              ) : (
                <ImageOrFileIcon att={att} />
              )}
              <Stack sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  noWrap
                  title={att.fileName}
                  sx={{ fontWeight: 500 }}
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
                  <IconButton size="small" component="a" href={url} download>
                    <DownloadOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Скопировать ссылку">
                  <IconButton size="small" onClick={() => copyLink(att)}>
                    <ContentCopyIcon fontSize="small" />
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
          )
        })}
      </Stack>
    </Stack>
  )
}

function ImageOrFileIcon({ att }: { att: AttachmentDto }) {
  if (isImage(att)) {
    return <ImageOutlinedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
  }
  return <InsertDriveFileOutlinedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
}
