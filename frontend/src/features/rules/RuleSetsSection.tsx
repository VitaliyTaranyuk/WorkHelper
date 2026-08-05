import { useState } from 'react'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { SettingsSection } from '@/page/settings/SettingsSection'
import { SkeletonLine } from '@/shared/ui/components/Skeleton'
import { LoadErrorState } from '@/shared/ui/components/LoadErrorState'
import { confirmDialog } from '@/shared/ui/components/ConfirmDialog'
import type { RuleDto, RuleRequest } from '@/shared/api/endpoint/rulesApi'
import {
  useCreateRuleSet,
  useDeleteRule,
  useDeleteRuleSet,
  useRuleSets,
  useRules,
  useSaveRule,
} from './query/useRuleSets'
import { RuleFormDialog } from './RuleFormDialog'
import {
  kindLabel,
  levelLabel,
  strengthLabel,
  verificationLabel,
} from './ruleLabels'

/**
 * T-511: наборы правил — общие пользователя и правила проекта.
 *
 * Одна секция на оба уровня, потому что уровень — это признак набора, а не
 * отдельная сущность (ADR-018): два почти одинаковых экрана разошлись бы, как
 * разошлись когда-то два файла правил (T-106/T-107).
 *
 * Набор **необязателен** — проект без единого набора работает как раньше (I-03),
 * и пустое состояние объясняет это прямо, а не молчит (**W-06**).
 */
export function RuleSetsSection({ projectId }: { projectId?: string }) {
  const { data, isLoading, isError, refetch } = useRuleSets(projectId)
  const createSet = useCreateRuleSet(projectId)
  const deleteSet = useDeleteRuleSet(projectId)

  const [name, setName] = useState('')
  const [openSetId, setOpenSetId] = useState<string | null>(null)

  const scopeIsProject = !!projectId
  const busy = createSet.isPending || deleteSet.isPending

  const submit = async () => {
    if (!name.trim()) return
    try {
      await createSet.mutateAsync({ name: name.trim() })
      setName('')
    } catch {
      // Причина показана тостом в мутации; поле не чистим, чтобы название не
      // пришлось вводить заново.
    }
  }

  const removeSet = async (setId: string, setName: string) => {
    const ok = await confirmDialog({
      title: 'Удалить набор правил',
      message: `Удалить «${setName}» вместе со всеми его правилами? Скопированные в другие проекты наборы это не тронет.`,
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (ok) deleteSet.mutate(setId)
  }

  return (
    <SettingsSection
      icon={<RuleOutlinedIcon fontSize="small" />}
      title={scopeIsProject ? 'Правила проекта' : 'Общие правила'}
      description={
        scopeIsProject
          ? 'Набор правил, по которым ведётся работа в этом проекте. Набор необязателен — без него всё работает как прежде.'
          : 'Ваши правила, не привязанные к проекту. Их можно перенести в новый проект при его создании.'
      }
    >
      {isError ? (
        <LoadErrorState
          title="Не удалось загрузить наборы правил"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <Stack gap={1}>
          <SkeletonLine height={40} />
          <SkeletonLine height={40} />
        </Stack>
      ) : (
        <Stack gap={2}>
          {data && data.length > 0 ? (
            <Stack gap={1} component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {data.map((set) => (
                <Stack
                  key={set.id}
                  component="li"
                  sx={{
                    border: '1px solid var(--wt-border)',
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Stack sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 14 }}>{set.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        правил: {set.rulesCount} · версия {set.version}
                      </Typography>
                    </Stack>
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() =>
                        setOpenSetId((id) => (id === set.id ? null : set.id))
                      }
                      startIcon={
                        openSetId === set.id ? <ExpandLessIcon /> : <ExpandMoreIcon />
                      }
                      sx={{ textTransform: 'none', color: 'text.secondary' }}
                    >
                      {openSetId === set.id ? 'Свернуть' : 'Правила'}
                    </Button>
                    <IconButton
                      size="small"
                      aria-label={`Удалить набор ${set.name}`}
                      disabled={busy}
                      onClick={() => void removeSet(set.id, set.name)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  <Collapse in={openSetId === set.id} unmountOnExit>
                    <RuleList projectId={projectId} ruleSetId={set.id} />
                  </Collapse>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {scopeIsProject
                ? 'Наборов правил нет. Это нормально: правила нужны, только когда вы хотите зафиксировать метод работы над проектом и перенести его дальше.'
                : 'Общих наборов нет. Это нормально: они нужны, только когда одни и те же правила должны переезжать из проекта в проект.'}
            </Typography>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
            <TextField
              size="small"
              label="Название набора"
              placeholder="Ядро WorkHelper"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <Button
              variant="contained"
              disabled={!name.trim() || busy}
              onClick={() => void submit()}
              sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, textTransform: 'none' }}
            >
              Создать набор
            </Button>
          </Stack>
        </Stack>
      )}
    </SettingsSection>
  )
}

/** Правила одного набора: список и правка. */
function RuleList({
  projectId,
  ruleSetId,
}: {
  projectId?: string
  ruleSetId: string
}) {
  const { data, isLoading, isError, refetch } = useRules(ruleSetId)
  const saveRule = useSaveRule(projectId, ruleSetId)
  const removeRule = useDeleteRule(projectId, ruleSetId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RuleDto | undefined>(undefined)

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  const openEdit = (rule: RuleDto) => {
    setEditing(rule)
    setFormOpen(true)
  }

  const submit = async (payload: RuleRequest) => {
    try {
      await saveRule.mutateAsync({ ruleId: editing?.id, data: payload })
      setFormOpen(false)
    } catch {
      // Причина показана тостом; форма остаётся открытой с введёнными данными.
    }
  }

  const remove = async (rule: RuleDto) => {
    const ok = await confirmDialog({
      title: 'Удалить правило',
      message: `Удалить правило ${rule.code}?`,
      confirmLabel: 'Удалить',
      destructive: true,
    })
    if (ok) removeRule.mutate(rule.id)
  }

  if (isError)
    return (
      <LoadErrorState
        title="Не удалось загрузить правила"
        onRetry={() => void refetch()}
      />
    )

  return (
    <Stack gap={1} sx={{ mt: 1.5 }}>
      {isLoading ? (
        <>
          <SkeletonLine height={32} />
          <SkeletonLine height={32} />
        </>
      ) : data && data.length > 0 ? (
        <Stack gap={1} component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {data.map((rule) => (
            <Stack
              key={rule.id}
              component="li"
              direction="row"
              alignItems="flex-start"
              gap={1}
            >
              <Stack sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {rule.code}
                  </Typography>
                  <Chip size="small" label={levelLabel(rule.level)} />
                  <Chip size="small" variant="outlined" label={strengthLabel(rule.strength)} />
                </Stack>
                <Typography variant="body2">{rule.body}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {kindLabel(rule.kind)} · {rule.triggerCondition} · проверка:{' '}
                  {verificationLabel(rule.verification)}
                </Typography>
              </Stack>
              <IconButton
                size="small"
                aria-label={`Изменить правило ${rule.code}`}
                onClick={() => openEdit(rule)}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              {/* Правило из стандартного набора не удаляется поштучно — кнопки
                  нет вовсе, иначе она была бы мёртвой (K-32). */}
              {!rule.systemRule && (
                <IconButton
                  size="small"
                  aria-label={`Удалить правило ${rule.code}`}
                  onClick={() => void remove(rule)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          В наборе пока нет правил.
        </Typography>
      )}

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={openCreate}
        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
      >
        Добавить правило
      </Button>

      <RuleFormDialog
        open={formOpen}
        rule={editing}
        busy={saveRule.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => void submit(payload)}
      />
    </Stack>
  )
}
