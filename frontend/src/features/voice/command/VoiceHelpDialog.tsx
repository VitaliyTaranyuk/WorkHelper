import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { voiceHelpCatalog, VOICE_LIMITATIONS } from './voiceHelp'
import { formatHotkey } from '../useVoiceHotkey'

/**
 * Справка и каталог возможностей голосового помощника (ТП-107). Каталог
 * генерируется из реестра команд; не требует запоминания точных команд —
 * показывает действия и естественные примеры фраз. Ограничения версии — явно.
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
  const catalog = voiceHelpCatalog()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Голосовой помощник — возможности</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Нажмите микрофон или {formatHotkey(hotkey)} и скажите обычной речью.
          Точную команду запоминать не нужно — вот что можно делать:
        </Typography>

        {catalog.map((group) => (
          <Box key={group.category} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {group.category}
            </Typography>
            {group.items.map((item) => (
              <Box key={item.title} sx={{ mb: 1 }}>
                <Typography variant="body2">{item.title}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                  {item.examples.map((ex) => (
                    <Chip key={ex} label={ex} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        ))}

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
          Ограничения текущей версии
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {VOICE_LIMITATIONS.map((l) => (
            <Typography key={l} component="li" variant="caption" color="text.secondary">
              {l}
            </Typography>
          ))}
        </Box>
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
