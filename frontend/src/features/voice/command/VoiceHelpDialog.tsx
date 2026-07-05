import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import { VoiceHelpContent } from './VoiceHelpContent'

/**
 * Справка голосового помощника (ТП-107) в модалке. Содержимое — общий
 * `VoiceHelpContent` (тот же, что в разделе «Настройки», ТП-110): единый
 * источник, без дублирования.
 */
export function VoiceHelpDialog({
  open,
  hotkey,
  onClose,
  onStartOnboarding,
}: {
  open: boolean
  hotkey: string
  onClose: () => void
  onStartOnboarding: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Голосовой помощник — возможности</DialogTitle>
      <DialogContent dividers>
        <VoiceHelpContent hotkey={hotkey} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onStartOnboarding} color="inherit">
          Пройти обучение
        </Button>
        <Button variant="contained" onClick={onClose}>
          Понятно
        </Button>
      </DialogActions>
    </Dialog>
  )
}
