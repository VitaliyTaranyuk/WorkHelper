import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { modalStyle } from '@/shared/ui/modalStyles'
import { useCreateProject } from '@/features/project/mutation/useProjectActions'
import { useUserProjects } from '@/features/project/query/useProjectData'
import { useRuleSets } from '@/features/rules/query/useRuleSets'
import {
  PROJECT_CODE_HINT,
  deriveProjectCode,
  isValidProjectCode,
  normalizeProjectCodeInput,
} from '@/features/project/projectCode'

/** Значение «не копировать» в выпадающем списке доноров (T-512). */
const NO_DONOR = ''

export const CreateProjectModal = NiceModal.create(() => {
  const modal = useModal()
  const createProject = useCreateProject()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  // ТП-190: код автогенерируется из названия, пока пользователь не задал
  // его вручную — тогда автосинхронизация прекращается (паттерн Linear).
  const [codeTouched, setCodeTouched] = useState(false)
  const [description, setDescription] = useState('')
  // T-512: правила переносятся тем же шагом, что колонки и спринт (ADR-019).
  // Общие наборы пользователя едут всегда, донор — по явному выбору.
  const [donorProjectId, setDonorProjectId] = useState<string>(NO_DONOR)
  const { data: userProjects } = useUserProjects()
  const { data: generalRuleSets } = useRuleSets(undefined)
  const donorCandidates = userProjects ?? []
  const generalSetsCount = generalRuleSets?.length ?? 0

  const codeValid = isValidProjectCode(code)
  const valid = name.trim().length > 0 && codeValid
  // Ошибку формата показываем только когда есть что показывать (не на пустом)
  const codeError = code.length > 0 && !codeValid

  const onNameChange = (value: string) => {
    setName(value)
    if (!codeTouched) setCode(deriveProjectCode(value))
  }

  const onCodeChange = (value: string) => {
    setCodeTouched(true)
    setCode(normalizeProjectCodeInput(value))
  }

  const close = () => {
    modal.reject()
    modal.hide()
  }

  const submit = async () => {
    if (!valid) return
    await createProject.mutateAsync({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      donorProjectId: donorProjectId || undefined,
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
        Новый проект
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
          <TextField
            label="Название"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            fullWidth
            size="small"
            autoFocus
          />
          <TextField
            label="Код проекта"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            fullWidth
            size="small"
            error={codeError}
            helperText={
              codeError ? 'Неверный формат. ' + PROJECT_CODE_HINT : PROJECT_CODE_HINT
            }
          />
          <TextField
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />

          {/* T-512: перенос правил. Выпадающий список показываем, только когда
              переносить есть откуда, — иначе это мёртвый контрол (K-32). */}
          {donorCandidates.length > 0 && (
            <TextField
              select
              label="Скопировать правила из проекта"
              value={donorProjectId}
              onChange={(e) => setDonorProjectId(e.target.value)}
              fullWidth
              size="small"
              helperText="Правила скопируются один раз. Дальше они принадлежат новому проекту, и правки в источнике их не меняют."
            >
              <MenuItem value={NO_DONOR}>Не копировать</MenuItem>
              {donorCandidates.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* Общие наборы едут всегда — говорим об этом прямо, иначе перенос
              выглядел бы происходящим сам по себе (W-06). */}
          {generalSetsCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              Ваши общие правила ({generalSetsCount}{' '}
              {generalSetsCount === 1 ? 'набор' : 'наб.'}) будут скопированы в
              новый проект.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 0, mt: '16px' }}>
        <Button
          style={{ width: '50%' }}
          variant="primary"
          disabled={!valid || createProject.isPending}
          onClick={submit}
        >
          Создать
        </Button>
      </DialogActions>
    </Dialog>
  )
})
