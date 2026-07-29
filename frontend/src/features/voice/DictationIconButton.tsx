import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'

/**
 * Кнопка микрофона — только внешний вид и клик (ТП-241). Сессией управляет
 * вызывающий: у комментария это {@link DictationButton} (текст приходит одним
 * куском в конце), у описания — {@link useLiveDictation} (живая расшифровка).
 * Общий вид вынесен сюда, чтобы два места диктовки не разошлись визуально.
 */
export function DictationIconButton({
  listening,
  processing,
  targetLabel,
  onClick,
}: {
  listening: boolean
  /** ТП-212: текст уже в поле, идёт фоновое улучшение формулировки. */
  processing: boolean
  targetLabel: string
  onClick: () => void
}) {
  return (
    <Tooltip
      title={
        listening
          ? 'Идёт запись — Enter вставит текст, Esc отменит'
          : processing
            ? 'Текст уже в поле — улучшаем формулировку…'
            : `Надиктовать ${targetLabel} голосом`
      }
    >
      <span>
        <IconButton
          size="small"
          aria-label={listening ? 'Закончить диктовку' : 'Надиктовать голосом'}
          onClick={onClick}
          sx={listening ? { color: 'error.main' } : undefined}
        >
          {listening ? (
            <StopCircleOutlinedIcon fontSize="small" />
          ) : processing ? (
            <CircularProgress size={16} thickness={5} />
          ) : (
            <MicNoneOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  )
}
