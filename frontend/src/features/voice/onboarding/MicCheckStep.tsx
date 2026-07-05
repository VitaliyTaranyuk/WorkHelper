import { useCallback, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import { useSpeechRecognition } from '../useSpeechRecognition'
import { useMicCheck } from './useMicCheck'
import { LevelMeter } from './LevelMeter'
import { calibrationVerdict, type CalibrationVerdict } from './micLevel'

/** Фраза для калибровки — осмысленная и не слишком короткая (лучше распознаётся). */
export const CALIBRATION_PHRASE = 'Сегодня я тестирую голосового помощника'

type Phase = 'idle' | 'checking' | 'result'

type Result = {
  transcript: string
  verdict: CalibrationVerdict
}

/**
 * Проверка оборудования + калибровка микрофона (ТП-118). Один связный шаг:
 * поддержка браузера → доступ к микрофону → живой уровень сигнала + распознанный
 * текст → вердикт с рекомендациями. Уровень берём из Web Audio (useMicCheck),
 * распознавание — из Web Speech (useSpeechRecognition); во время произнесения
 * работают оба, поэтому пользователь видит и «слышно ли», и «понимается ли».
 */
export function MicCheckStep({
  onComplete,
  onSkip,
}: {
  onComplete: (ok: boolean) => void
  onSkip?: () => void
}) {
  const mic = useMicCheck()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Result | null>(null)

  // Актуальный пик — читаем в onFinish (замыкание пересоздаётся каждый рендер).
  const peakRef = useRef(0)
  peakRef.current = mic.peak

  const onFinish = useCallback(
    (transcript: string) => {
      mic.stop()
      const text = transcript.trim()
      setResult({ transcript: text, verdict: calibrationVerdict(peakRef.current) })
      setPhase('result')
    },
    [mic],
  )

  const speech = useSpeechRecognition({ onFinish })

  const supported = speech.supported && mic.supported

  const startCheck = useCallback(() => {
    setResult(null)
    setPhase('checking')
    void mic.start()
    speech.start()
  }, [mic, speech])

  const stopCheck = useCallback(() => {
    // Явно завершаем распознавание — onFinish отдаст накопленный текст и вердикт.
    speech.stop()
  }, [speech])

  if (!supported) {
    return (
      <Stack gap={2}>
        <Alert severity="warning">
          Распознавание речи недоступно в этом браузере. Голосовой помощник
          работает в Chrome, Edge или Safari. Откройте WorkTask в одном из них,
          чтобы пройти обучение.
        </Alert>
        {onSkip && (
          <Button onClick={onSkip} color="inherit">
            Продолжить без проверки
          </Button>
        )}
      </Stack>
    )
  }

  const liveText = speech.transcript || speech.interim
  const micError = mic.error
  const speechError = phase === 'checking' ? speech.error : null

  return (
    <Stack gap={2}>
      <Typography variant="body2" color="text.secondary">
        Проверим, что микрофон подключён и голос уверенно распознаётся. Это
        занимает несколько секунд.
      </Typography>

      {phase === 'idle' && (
        <Stack gap={2}>
          <Typography variant="body2">
            Нажмите «Проверить микрофон» и произнесите вслух:
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ fontStyle: 'italic', px: 1.5, py: 1, bgcolor: 'action.hover', borderRadius: 1 }}
          >
            «{CALIBRATION_PHRASE}»
          </Typography>
          <Stack direction="row" gap={1}>
            <Button
              variant="contained"
              startIcon={<MicNoneOutlinedIcon />}
              onClick={startCheck}
            >
              Проверить микрофон
            </Button>
            {onSkip && (
              <Button color="inherit" onClick={onSkip}>
                Пропустить
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      {phase === 'checking' && (
        <Stack gap={1.5}>
          <Stack direction="row" alignItems="center" gap={1}>
            <CircularProgress size={18} />
            <Typography variant="body2">
              Говорите: «{CALIBRATION_PHRASE}»
            </Typography>
          </Stack>
          <LevelMeter level={mic.level} />
          <Typography variant="caption" color={mic.signalDetected ? 'success.main' : 'text.secondary'}>
            {mic.signalDetected ? 'Сигнал есть — микрофон вас слышит' : 'Ждём сигнал с микрофона…'}
          </Typography>
          <Box
            sx={{
              minHeight: 40,
              px: 1.5,
              py: 1,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color={liveText ? 'text.primary' : 'text.disabled'}>
              {liveText || 'Распознанный текст появится здесь…'}
            </Typography>
          </Box>
          {(micError || speechError) && (
            <Alert severity="error">{micError || speechError}</Alert>
          )}
          <Button variant="outlined" onClick={stopCheck}>
            Готово
          </Button>
        </Stack>
      )}

      {phase === 'result' && result && (
        <Stack gap={1.5}>
          <Alert severity={result.verdict.tone}>{result.verdict.message}</Alert>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Распознано:
            </Typography>
            <Typography variant="body2">
              {result.transcript || '— ничего не распознано —'}
            </Typography>
          </Box>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={startCheck}>
              Повторить
            </Button>
            <Button variant="contained" onClick={() => onComplete(result.verdict.ok)}>
              Далее
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
