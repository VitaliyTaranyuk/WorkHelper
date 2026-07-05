import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined'
import { MicCheckStep } from './MicCheckStep'
import { VoicePractice } from './VoicePractice'
import { getProgress, setProgress } from './onboardingProgress'

/**
 * Единый поток обучения голосовому помощнику (ТП-118): знакомство → проверка и
 * калибровка микрофона → интерактивная практика по реальным сценариям. Прогресс
 * сохраняется, поэтому обучение можно пройти позже, пропустить или продолжить с
 * места остановки. Знакомство и проверка — в модалке; практика — подсветка
 * поверх реального интерфейса (пользователь работает голосом сам).
 */
type Stage = 'welcome' | 'mic' | 'practice'

const BULLETS: { icon: React.ReactNode; text: string }[] = [
  { icon: <MicNoneOutlinedIcon fontSize="small" color="primary" />, text: 'Проверим микрофон и калибровку — чтобы вас точно услышали' },
  { icon: <PlayCircleOutlineIcon fontSize="small" color="primary" />, text: 'Вместе выполним реальные действия голосом, а не прочитаем инструкцию' },
  { icon: <RecordVoiceOverOutlinedIcon fontSize="small" color="primary" />, text: 'Убедитесь, что команды можно говорить обычной речью' },
]

export function VoiceOnboardingFlow({
  open,
  onExit,
}: {
  open: boolean
  onExit: () => void
}) {
  const [stage, setStage] = useState<Stage>('welcome')

  // При открытии — возобновляем с сохранённой стадии, иначе с приветствия.
  useEffect(() => {
    if (!open) return
    const p = getProgress()
    if (p.status === 'in_progress' && p.stage === 'practice') setStage('practice')
    else if (
      p.status === 'in_progress' &&
      (p.stage === 'hardware' || p.stage === 'calibration')
    )
      setStage('mic')
    else setStage('welcome')
  }, [open])

  if (!open) return null

  const startTraining = () => {
    setProgress({ status: 'in_progress', stage: 'hardware' })
    setStage('mic')
  }
  const later = () => {
    setProgress({ status: 'later' })
    onExit()
  }
  const skipAll = () => {
    setProgress({ status: 'skipped' })
    onExit()
  }
  const goPractice = () => {
    setProgress({ status: 'in_progress', stage: 'practice' })
    setStage('practice')
  }
  const finish = () => {
    setProgress({ status: 'completed', stage: 'done' })
    onExit()
  }

  if (stage === 'welcome') {
    return (
      <Dialog open onClose={later} maxWidth="xs" fullWidth>
        <DialogTitle>Голосовое управление WorkTask</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            За 2–3 минуты научитесь управлять задачами, спринтами и календарём
            голосом — обычной речью, без запоминания команд.
          </Typography>
          <Stack gap={1.25}>
            {BULLETS.map((b) => (
              <Stack key={b.text} direction="row" gap={1} alignItems="flex-start">
                {b.icon}
                <Typography variant="body2">{b.text}</Typography>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={skipAll}>
            Пропустить
          </Button>
          <Button color="inherit" onClick={later}>
            Позже
          </Button>
          <Button variant="contained" onClick={startTraining}>
            Начать обучение
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  if (stage === 'mic') {
    return (
      <Dialog open onClose={goPractice} maxWidth="xs" fullWidth>
        <DialogTitle>Проверка микрофона</DialogTitle>
        <DialogContent>
          <MicCheckStep onComplete={goPractice} onSkip={goPractice} />
        </DialogContent>
      </Dialog>
    )
  }

  // Практика — подсветка поверх реального интерфейса (без модалки).
  return <VoicePractice onDone={finish} onSkip={finish} />
}
