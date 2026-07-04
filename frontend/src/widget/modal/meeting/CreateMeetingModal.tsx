import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { modalStyle } from '@/shared/ui/modalStyles'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useCreateMeeting } from '@/features/meeting/useMeetings'

const TELEMOST_CREATE_URL = 'https://telemost.yandex.ru/create'
const LINK_PATTERN = /^https?:\/\/.+/

function withSeconds(local: string): string {
  // datetime-local -> "yyyy-MM-ddTHH:mm" ; backend expects seconds
  return local.length === 16 ? `${local}:00` : local
}

/**
 * Создание встречи (ТП-67): модалка в общем стиле приложения — как создание
 * задачи/проекта/спринта (раньше форма постоянно висела боковой панелью
 * календаря, что не соответствовало паттернам ни TMS, ни календарей).
 * Поля оформлены по паттерну форм WorkTask: подпись (FormCaption) над полем.
 */
export const CreateMeetingModal = NiceModal.create(
  ({ projectId, initialDate }: { projectId: string; initialDate?: string }) => {
    const modal = useModal()
    const createMeeting = useCreateMeeting(projectId)
    const { activeProject } = useProjectData()
    const users = activeProject?.users ?? []

    const [title, setTitle] = useState('')
    // Клик по дню календаря (ТП-67) — предзаполняем начало на 10:00 выбранной даты.
    const [startAt, setStartAt] = useState(initialDate ? `${initialDate}T10:00` : '')
    const [endAt, setEndAt] = useState('')
    const [link, setLink] = useState('')
    const [participantIds, setParticipantIds] = useState<string[]>([])

    const linkTrimmed = link.trim()
    const linkValid = linkTrimmed.length === 0 || LINK_PATTERN.test(linkTrimmed)
    const valid = title.trim().length > 0 && startAt.length > 0 && linkValid

    const close = () => {
      modal.reject()
      modal.hide()
    }

    const submit = async () => {
      if (!valid || createMeeting.isPending) return
      await createMeeting.mutateAsync({
        title: title.trim(),
        startAt: withSeconds(startAt),
        endAt: endAt ? withSeconds(endAt) : undefined,
        link: linkTrimmed.length > 0 ? linkTrimmed : undefined,
        participantIds,
      })
      modal.resolve()
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
          Новая встреча
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={close}
          sx={{ position: 'absolute', right: 32, top: 28 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={modalStyle.modalContent}>
          <Stack gap={2}>
            <Stack gap={0.5}>
              <FormCaption>Название</FormCaption>
              <TextField
                size="small"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: планёрка команды"
                autoFocus
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <Stack gap={0.5} sx={{ flex: 1 }}>
                <FormCaption>Начало</FormCaption>
                <TextField
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </Stack>
              <Stack gap={0.5} sx={{ flex: 1 }}>
                <FormCaption>Окончание (необязательно)</FormCaption>
                <TextField
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </Stack>
            </Stack>

            <Stack gap={0.5}>
              <FormCaption>Участники</FormCaption>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  displayEmpty
                  value={participantIds}
                  onChange={(e) => setParticipantIds(e.target.value as string[])}
                  renderValue={(selected) =>
                    selected.length === 0
                      ? 'Не выбраны'
                      : users
                          .filter((u) => selected.includes(u.id))
                          .map((u) => `${u.firstName} ${u.lastName}`)
                          .join(', ')
                  }
                >
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack gap={0.5}>
              <FormCaption>Ссылка на встречу (необязательно)</FormCaption>
              <TextField
                size="small"
                fullWidth
                placeholder="https://telemost.yandex.ru/j/…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                error={!linkValid}
                helperText={
                  !linkValid
                    ? 'Ссылка должна начинаться с http:// или https://'
                    : undefined
                }
              />
              <Stack direction="row" alignItems="center" gap={1}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    window.open(TELEMOST_CREATE_URL, '_blank', 'noopener,noreferrer')
                  }
                >
                  <VideocamOutlinedIcon fontSize="small" style={{ marginRight: 6 }} />
                  Создать встречу в Телемосте
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Телемост откроется в новой вкладке — скопируйте оттуда ссылку
                и вставьте её в поле выше.
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: '16px' }}>
          <Button
            style={{ width: '50%' }}
            variant="primary"
            disabled={!valid || createMeeting.isPending}
            onClick={submit}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    )
  },
)
