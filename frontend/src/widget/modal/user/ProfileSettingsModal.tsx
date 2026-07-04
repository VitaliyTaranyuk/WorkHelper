import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/Button'
import { modalStyle } from '@/shared/ui/modalStyles'
import { workTechApi } from '@/shared/api/endpoint'
import { useAuthStore } from '@/features/auth/authStore'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'
import type { FullUserData } from '@/entities/user/types'

const USERNAME_PATTERN = /^[a-z0-9_]{2,32}$/
const PHONE_PATTERN = /^[0-9+()\-\s]{0,20}$/

/**
 * Настройки профиля пользователя (ТП-63): минимальный набор по практике
 * зрелых TMS — имя/фамилия, отображаемое имя, username (для @упоминаний),
 * телефон. E-mail показывается только для чтения: смена почты требует
 * подтверждения и в текущей архитектуре не поддерживается.
 */
export const ProfileSettingsModal = NiceModal.create(
  ({ user }: { user: FullUserData }) => {
    const modal = useModal()
    const getCurrentUser = useAuthStore((s) => s.getCurrentUser)

    const [firstName, setFirstName] = useState(user.firstName ?? '')
    const [lastName, setLastName] = useState(user.lastName ?? '')
    const [displayName, setDisplayName] = useState(user.displayName ?? '')
    const [username, setUsername] = useState(user.username ?? '')
    const [phone, setPhone] = useState(user.phone ?? '')
    const [saving, setSaving] = useState(false)

    const usernameValid =
      username.trim().length === 0 || USERNAME_PATTERN.test(username.trim())
    const phoneValid = PHONE_PATTERN.test(phone.trim())
    const valid = firstName.trim().length > 0 && usernameValid && phoneValid

    const close = () => {
      modal.reject()
      modal.hide()
    }

    const submit = async () => {
      if (!valid || saving) return
      setSaving(true)
      try {
        await workTechApi.user.updateProfile({
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim() || undefined,
            displayName: displayName.trim() || undefined,
            username: username.trim() || undefined,
            phone: phone.trim(),
          },
        })
        // Обновляем пользователя в сторе — имя в шапке меняется сразу.
        await getCurrentUser()
        toast.success('Профиль обновлён')
        modal.resolve()
        modal.hide()
      } catch (err) {
        toast.error(extractGeneralError(err) ?? 'Не удалось обновить профиль')
      } finally {
        setSaving(false)
      }
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
          Настройки профиля
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
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField
                label="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                size="small"
                autoFocus
                required
                error={firstName.trim().length === 0}
              />
              <TextField
                label="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            <TextField
              label="Отображаемое имя"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              size="small"
              helperText="Показывается вместо «Фамилия Имя» в интерфейсе"
            />
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              fullWidth
              size="small"
              error={!usernameValid}
              helperText={
                usernameValid
                  ? 'Для @упоминаний: строчная латиница, цифры, _ (2–32)'
                  : 'Username: 2–32 символа, строчная латиница, цифры, _'
              }
            />
            <TextField
              label="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              size="small"
              error={!phoneValid}
              helperText={
                phoneValid ? undefined : 'Цифры, +, скобки, дефисы (до 20 символов)'
              }
            />
            <TextField
              label="E-mail"
              value={user.email}
              fullWidth
              size="small"
              disabled
              helperText="Смена e-mail пока недоступна — почта используется для входа"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 0, mt: '16px' }}>
          <Button
            style={{ width: '50%' }}
            variant="primary"
            disabled={!valid || saving}
            onClick={submit}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    )
  },
)
