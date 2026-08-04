import { useState } from 'react'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { SettingsSection } from '@/page/settings/SettingsSection'
import { SkeletonLine } from '@/shared/ui/components/Skeleton'
import { LoadErrorState } from '@/shared/ui/components/LoadErrorState'
import { confirmDialog } from '@/shared/ui/components/ConfirmDialog'
import {
  useCreateRepoBinding,
  useDeleteRepoBinding,
  useRepoBindings,
} from '@/features/project/query/useRepoBindings'

const PROVIDERS = ['github', 'gitlab', 'bitbucket', 'gitea'] as const

/**
 * T-510: репозитории проекта.
 *
 * Привязка **необязательна** — проект без неё работает как раньше (I-03), и
 * пустое состояние объясняет это прямо, а не молчит: иначе раздел выглядел бы
 * сломанным (**W-06**).
 */
export function RepoBindingsSection({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, refetch } = useRepoBindings(projectId)
  const createBinding = useCreateRepoBinding(projectId)
  const deleteBinding = useDeleteRepoBinding(projectId)

  const [provider, setProvider] = useState<string>('github')
  const [url, setUrl] = useState('')
  const [branch, setBranch] = useState('main')

  const canSubmit = url.trim().length > 0 && branch.trim().length > 0
  const busy = createBinding.isPending || deleteBinding.isPending

  const submit = async () => {
    if (!canSubmit) return
    try {
      await createBinding.mutateAsync({
        provider,
        url: url.trim(),
        defaultBranch: branch.trim(),
      })
      setUrl('')
    } catch {
      // Причина показана тостом в мутации; поле не чистим, чтобы адрес не
      // пришлось вводить заново.
    }
  }

  const remove = async (bindingId: string, bindingUrl: string) => {
    const ok = await confirmDialog({
      title: 'Убрать привязку',
      message: `Убрать связь проекта с ${bindingUrl}? Сам репозиторий это не тронет.`,
      confirmLabel: 'Убрать',
      destructive: true,
    })
    if (ok) deleteBinding.mutate(bindingId)
  }

  return (
    <SettingsSection
      icon={<AccountTreeOutlinedIcon fontSize="small" />}
      title="Репозитории проекта"
      description="Где живёт код этого проекта. Привязка необязательна — без неё всё работает как прежде."
    >
      {isError ? (
        <LoadErrorState
          title="Не удалось загрузить привязки"
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
              {data.map((binding) => (
                <Stack
                  key={binding.id}
                  component="li"
                  direction="row"
                  alignItems="center"
                  gap={1}
                  sx={{
                    border: '1px solid var(--wt-border)',
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Stack sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 14, wordBreak: 'break-all' }}>
                      {binding.url}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {binding.provider} · ветка по умолчанию: {binding.defaultBranch}
                    </Typography>
                  </Stack>
                  <IconButton
                    size="small"
                    aria-label={`Убрать привязку ${binding.url}`}
                    disabled={busy}
                    onClick={() => void remove(binding.id, binding.url)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Репозиторий не привязан. Это нормально: привязка нужна, только
              когда вы хотите связать задачи проекта с кодом.
            </Typography>
          )}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            gap={1.5}
            alignItems={{ md: 'flex-start' }}
          >
            <TextField
              select
              size="small"
              label="Провайдер"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              {PROVIDERS.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Адрес репозитория"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <TextField
              size="small"
              label="Ветка по умолчанию"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <Button
              variant="contained"
              disabled={!canSubmit || busy}
              onClick={() => void submit()}
              sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
            >
              Привязать
            </Button>
          </Stack>
        </Stack>
      )}
    </SettingsSection>
  )
}
