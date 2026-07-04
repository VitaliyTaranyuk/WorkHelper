import { useEffect } from 'react'
import Button from '@mui/material/Button'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import { notify as toast } from '@/shared/ui/notify'
import { useVoiceInput } from './useVoiceInput'
import type { TaskDraft } from './core/textFormatter'

type Props = {
  /** Черновик задачи из диктовки: название + описание. */
  onDraft: (draft: TaskDraft) => void
}

/**
 * ТП-88: диктовка ЗАДАЧИ в форме создания. Распознанный текст делится
 * (первая законченная мысль → название, остальное → описание) и заполняет
 * поля формы. Намерение CREATE_TASK, тот же конвейер, что и диктовка полей
 * (SpeechRecognition → IntentAnalyzer-заглушка → TextFormatter → Executor).
 */
export function TaskDictationButton({ onDraft }: Props) {
  const speech = useVoiceInput({
    context: { intent: { type: 'CREATE_TASK' } },
    handlers: { onTaskDraft: onDraft },
    onEmpty: () => toast.error('Ничего не удалось расслышать — попробуйте ещё раз'),
  })
  const listening = speech.status === 'listening'

  useEffect(() => {
    if (speech.status === 'error' && speech.error) toast.error(speech.error)
  }, [speech.status, speech.error])

  if (!speech.supported) return null

  return (
    <Button
      size="small"
      variant="outlined"
      color={listening ? 'error' : 'primary'}
      startIcon={
        listening ? (
          <StopCircleOutlinedIcon fontSize="small" />
        ) : (
          <MicNoneOutlinedIcon fontSize="small" />
        )
      }
      onClick={() => (listening ? speech.stop() : speech.start())}
      sx={{ textTransform: 'none' }}
    >
      {listening ? 'Готово' : 'Надиктовать задачу'}
    </Button>
  )
}
