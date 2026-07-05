import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { VOICE_ONBOARDING_STEPS } from './voiceHelp'

/**
 * Первое знакомство с голосовым управлением (ТП-107): короткий интерактивный
 * степпер. Обучение через действие: пользователь может пройти или пропустить,
 * повторно — из справки. Единый стиль (MUI Dialog).
 */
export function VoiceOnboarding({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const steps = VOICE_ONBOARDING_STEPS
  const isLast = step >= steps.length - 1
  const current = steps[step]

  const handleClose = () => {
    setStep(0)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{current.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {current.text}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 2 }}>
          {steps.map((_, i) => (
            <Box
              key={i}
              sx={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                bgcolor: i <= step ? 'primary.main' : 'divider',
              }}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Пропустить
        </Button>
        {step > 0 && (
          <Button onClick={() => setStep((s) => s - 1)}>Назад</Button>
        )}
        {isLast ? (
          <Button variant="contained" onClick={handleClose}>
            Начать
          </Button>
        ) : (
          <Button variant="contained" onClick={() => setStep((s) => s + 1)}>
            Далее
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
