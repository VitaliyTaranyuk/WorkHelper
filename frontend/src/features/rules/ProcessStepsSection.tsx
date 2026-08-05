import { useState } from 'react'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { SettingsSection } from '@/page/settings/SettingsSection'
import { SkeletonLine } from '@/shared/ui/components/Skeleton'
import { LoadErrorState } from '@/shared/ui/components/LoadErrorState'
import { confirmDialog } from '@/shared/ui/components/ConfirmDialog'
import {
  useCreateDefaultProcessSteps,
  useCreateProcessStep,
  useDeleteProcessStep,
  useMoveProcessStep,
  useProcessSteps,
} from './query/useProcessSteps'

/**
 * T-515 (ADR-021): процесс задачи проекта.
 *
 * Процесс — переносимая часть метода работы, как и правила: он принадлежит проекту,
 * копируется при создании нового и уезжает в `AGENTS.md` вместе с правилами (T-514).
 *
 * Процесс **необязателен** — проект без единого этапа работает как раньше (I-03), и
 * пустое состояние объясняет это прямо, а не молчит (**W-06**). Существующему проекту
 * этапы заводятся **явной командой**: молча дописывать строки в проекты, которые о фазе
 * не просили, запрещено условием 4 ADR-027.
 */
export function ProcessStepsSection({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, refetch } = useProcessSteps(projectId)
  const createStep = useCreateProcessStep(projectId)
  const createDefaults = useCreateDefaultProcessSteps(projectId)
  const moveStep = useMoveProcessStep(projectId)
  const deleteStep = useDeleteProcessStep(projectId)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const steps = data ?? []
  const busy =
    createStep.isPending ||
    createDefaults.isPending ||
    moveStep.isPending ||
    deleteStep.isPending

  const submit = async () => {
    if (!code.trim() || !name.trim()) return
    try {
      await createStep.mutateAsync({ code: code.trim(), name: name.trim() })
      setCode('')
      setName('')
    } catch {
      // Причина показана тостом; поля не чистим, чтобы не вводить заново.
    }
  }

  const remove = async (stepId: string, stepCode: string) => {
    const ok = await confirmDialog({
      title: 'Удалить этап',
      message: `Удалить этап ${stepCode} из процесса проекта?`,
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (ok) deleteStep.mutate(stepId)
  }

  return (
    <SettingsSection
      icon={<RouteOutlinedIcon fontSize="small" />}
      title="Процесс задачи"
      description="Этапы, через которые проходит задача в этом проекте. Процесс переносится в новый проект вместе с правилами."
    >
      {isError ? (
        <LoadErrorState
          title="Не удалось загрузить процесс"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <Stack gap={1}>
          <SkeletonLine height={36} />
          <SkeletonLine height={36} />
        </Stack>
      ) : (
        <Stack gap={2}>
          {steps.length > 0 ? (
            <Stack gap={0.5} component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {steps.map((step, index) => (
                <Stack
                  key={step.id}
                  component="li"
                  direction="row"
                  alignItems="center"
                  gap={1}
                  sx={{
                    border: '1px solid var(--wt-border)',
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.75,
                  }}
                >
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', minWidth: 20 }}>
                    {step.position}
                  </Typography>
                  <Stack sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 14 }}>
                      <b>{step.code}</b> — {step.name}
                    </Typography>
                    {step.description && (
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    )}
                  </Stack>
                  <IconButton
                    size="small"
                    aria-label={`Поднять этап ${step.code}`}
                    disabled={busy || index === 0}
                    onClick={() => moveStep.mutate({ stepId: step.id, up: true })}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Опустить этап ${step.code}`}
                    disabled={busy || index === steps.length - 1}
                    onClick={() => moveStep.mutate({ stepId: step.id, up: false })}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Удалить этап ${step.code}`}
                    disabled={busy}
                    onClick={() => void remove(step.id, step.code)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Stack gap={1.5} alignItems="flex-start">
              <Typography variant="body2" color="text.secondary">
                Процесс не задан. Это нормально: этапы нужны, только когда вы хотите
                зафиксировать порядок работы над задачей и перенести его в другие проекты.
              </Typography>
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => createDefaults.mutate()}
                sx={{ textTransform: 'none' }}
              >
                Завести процесс по умолчанию (A0 … V)
              </Button>
            </Stack>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
            <TextField
              size="small"
              label="Код этапа"
              placeholder="A1"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              sx={{ minWidth: 130 }}
            />
            <TextField
              size="small"
              label="Название этапа"
              placeholder="Анализ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <Button
              variant="contained"
              disabled={!code.trim() || !name.trim() || busy}
              onClick={() => void submit()}
              sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, textTransform: 'none' }}
            >
              Добавить этап
            </Button>
          </Stack>
        </Stack>
      )}
    </SettingsSection>
  )
}
