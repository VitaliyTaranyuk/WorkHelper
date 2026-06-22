import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useQuery } from '@tanstack/react-query'
import { workTechApi } from '@/shared/api/endpoint'
import type { ProjectHistoryDto } from '@/shared/api/endpoint/projectsApi'
import { modalStyle } from '@/shared/ui/modalStyles'
import { formatDateDDMMYYYY } from '@/shared/utils/date'

function describe(h: ProjectHistoryDto): string {
  const user = h.username ? `@${h.username}` : (h.userName ?? 'Пользователь')
  switch (h.changeType) {
    case 'COLUMN_RENAME':
      return `${user} изменил название "${h.oldValue}" на "${h.newValue}"`
    case 'COLUMN_CREATE':
      return `${user} создал колонку "${h.newValue}"`
    case 'COLUMN_DELETE':
      return `${user} удалил колонку "${h.oldValue}"`
    default:
      return `${user}: ${h.changeType} ${h.oldValue ?? ''} → ${h.newValue ?? ''}`
  }
}

export const ProjectHistoryModal = NiceModal.create(
  ({ projectId }: { projectId: string }) => {
    const modal = useModal()
    const { data: history } = useQuery({
      queryKey: ['projectHistory', projectId],
      queryFn: () =>
        workTechApi.project.getProjectHistory({ projectId }).then((r) => r.data),
    })

    const close = () => {
      modal.reject()
      modal.hide()
    }

    return (
      <Dialog
        open={modal.visible}
        onClose={close}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: modalStyle.modalContainer } }}
        onTransitionExited={() => modal.remove()}
      >
        <DialogTitle sx={{ p: 0, fontSize: '24px', fontWeight: 500 }}>
          История изменений
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={close}
          sx={{ position: 'absolute', right: 32, top: 28 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={{ p: 0, mt: '16px' }}>
          <Stack gap={1}>
            {(history ?? []).length === 0 && (
              <Typography color="text.secondary">Изменений пока нет</Typography>
            )}
            {(history ?? []).map((h, i) => (
              <Stack key={i} gap={0.25}>
                <Typography variant="body2">
                  <b>{formatDateDDMMYYYY(h.createdAt)}</b>{' '}
                  {new Date(h.createdAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  {describe(h)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    )
  },
)
