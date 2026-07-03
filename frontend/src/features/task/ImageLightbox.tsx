import { Dialog, IconButton, Stack, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { Loader } from '@/shared/ui/components/Loader'
import {
  downloadAttachment,
  useAttachmentBlobUrl,
  type AttachmentDto,
} from './useTaskAttachments'

type Props = {
  projectId: string
  taskId: string
  attachment: AttachmentDto | null
  onClose: () => void
}

/**
 * Встроенный просмотр изображений-вложений (lightbox, паттерн Jira/Linear):
 * тёмный оверлей, изображение по центру, скачивание и закрытие — без ухода
 * со страницы и без открытия новых вкладок.
 */
export function ImageLightbox({ projectId, taskId, attachment, onClose }: Props) {
  const open = attachment !== null
  const { data: blobUrl, isLoading } = useAttachmentBlobUrl({
    projectId,
    taskId,
    attachmentId: attachment?.id ?? '',
    enabled: open,
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: 'rgba(20, 20, 24, 0.96)',
            boxShadow: 'none',
            borderRadius: 2,
            maxWidth: '92vw',
            maxHeight: '92vh',
            m: 0,
          },
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ p: '8px 12px', color: 'rgba(255,255,255,0.85)' }}
      >
        <Typography variant="body2" noWrap sx={{ flex: 1 }} title={attachment?.fileName}>
          {attachment?.fileName}
        </Typography>
        {attachment && (
          <IconButton
            size="small"
            aria-label="Скачать изображение"
            onClick={() => downloadAttachment(projectId, taskId, attachment)}
            sx={{ color: 'inherit' }}
          >
            <DownloadOutlinedIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton
          size="small"
          aria-label="Закрыть просмотр"
          onClick={onClose}
          sx={{ color: 'inherit' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ p: 1.5, pt: 0, minWidth: 240, minHeight: 160 }}
      >
        {isLoading && <Loader isLoading />}
        {!isLoading && blobUrl && (
          <img
            src={blobUrl}
            alt={attachment?.fileName ?? ''}
            style={{
              maxWidth: '88vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              display: 'block',
              borderRadius: 4,
            }}
          />
        )}
      </Stack>
    </Dialog>
  )
}
