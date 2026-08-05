import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { SkeletonLine } from '@/shared/ui/components/Skeleton'
import {
  useSetTaskProcessStep,
  useSetTaskSize,
  useTaskProcess,
} from './query/useTaskProcess'

/** Размеры перечислены здесь, а не приходят с сервера: их четыре и они фиксированы (T-516). */
const SIZES = ['XS', 'S', 'M', 'L'] as const

/**
 * T-516: размер задачи и её место в процессе проекта.
 *
 * Размер отвечает не на вопрос «сколько часов» (для этого есть оценка), а на вопрос
 * «насколько глубоко идёт разбор»: `PROJECT_RULES §Пропорциональность анализа`.
 *
 * **Обязательность этапов не вычисляется здесь** — она приходит с сервера полем `required`.
 * Правило «этап обязателен с размера X» принадлежит проекту, и второе его вычисление на
 * клиенте неизбежно разошлось бы с серверным.
 *
 * Панель **не показывается**, если у проекта нет процесса: пустой блок «Процесс» в каждой
 * карточке был бы шумом, а не информацией (**F-04**). Процесс необязателен (I-03).
 */
export function TaskProcessPanel({
  projectId,
  taskId,
}: {
  projectId: string
  taskId: string
}) {
  const { data, isLoading, isError } = useTaskProcess(projectId, taskId)
  const setSize = useSetTaskSize(projectId, taskId)
  const setStep = useSetTaskProcessStep(projectId, taskId)

  if (isLoading) return <SkeletonLine height={32} />
  // Ошибку загрузки процесса не превращаем в ошибку карточки: задача читается и без него.
  if (isError || !data || data.steps.length === 0) return null

  const busy = setSize.isPending || setStep.isPending

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Процесс
      </Typography>

      <Stack gap={1.5}>
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
          <Typography variant="body2" color="text.secondary">
            Размер
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={data.size}
            disabled={busy}
            onChange={(_, value: string | null) =>
              // Повторный клик по выбранному размеру снимает его: снятие разрешено,
              // иначе размер стал бы обязательным полем с чёрного хода.
              setSize.mutate(value)
            }
          >
            {SIZES.map((size) => (
              <ToggleButton key={size} value={size} sx={{ px: 1.5, textTransform: 'none' }}>
                {size}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {!data.size && (
            <Typography variant="body2" color="text.secondary">
              не задан — обязательных этапов нет
            </Typography>
          )}
        </Stack>

        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {data.steps.map((step) => (
            <Chip
              key={step.id}
              size="small"
              label={step.required ? `${step.code} •` : step.code}
              title={
                step.required
                  ? `${step.name} — обязателен для этого размера`
                  : `${step.name} — необязателен для этого размера`
              }
              color={step.current ? 'primary' : 'default'}
              variant={step.current ? 'filled' : 'outlined'}
              disabled={busy}
              onClick={() => setStep.mutate(step.current ? null : step.id)}
            />
          ))}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Точкой отмечены этапы, обязательные для выбранного размера. Клик по этапу делает
          его текущим, повторный — снимает.
        </Typography>
      </Stack>
    </Box>
  )
}
