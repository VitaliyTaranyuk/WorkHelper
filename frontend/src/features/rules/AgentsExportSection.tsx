import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import { SettingsSection } from '@/page/settings/SettingsSection'
import { SkeletonLine } from '@/shared/ui/components/Skeleton'
import { notify } from '@/shared/ui/notify'
import type { AgentsFileDto } from '@/shared/api/endpoint/rulesApi'
import { useExportAgentsMd, useRuleSets } from './query/useRuleSets'

/**
 * T-514 (ADR-023): выгрузка правил проекта в `AGENTS.md`.
 *
 * Файл — **рабочая копия** правил, а не отчёт о них: агент читает файлы репозитория, а не
 * базу (ADR-017), поэтому выгруженный файл самодостаточен и работает при недоступном
 * WorkTask (ADR-025).
 *
 * **Коммит в репозиторий делает человек или агент, а не платформа**: интеграция с GitHub
 * здесь read-only и без токена, а заводить токены — действие владельца (**K-33**). Раздел
 * говорит об этом прямо, а не намекает кнопкой, которой нет.
 */
export function AgentsExportSection({ projectId }: { projectId: string }) {
  const ruleSets = useRuleSets(projectId)
  const exportFile = useExportAgentsMd(projectId)
  const [file, setFile] = useState<AgentsFileDto | null>(null)

  const hasRuleSets = (ruleSets.data?.length ?? 0) > 0

  const generate = async () => {
    try {
      setFile(await exportFile.mutateAsync())
    } catch {
      // Причина показана тостом в мутации.
    }
  }

  const download = () => {
    if (!file) return
    const url = URL.createObjectURL(
      new Blob([file.content], { type: 'text/markdown;charset=utf-8' }),
    )
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = file.fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
      // отложенный revoke: браузеру нужно успеть начать скачивание
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    }
  }

  const copy = () => {
    if (!file) return
    void navigator.clipboard
      .writeText(file.content)
      .then(() => notify.success('AGENTS.md скопирован'))
      .catch(() => notify.error('Не удалось скопировать'))
  }

  return (
    <SettingsSection
      icon={<DescriptionOutlinedIcon fontSize="small" />}
      title="AGENTS.md для репозитория"
      description="Правила проекта одним файлом. Положите его в корень репозитория — дальше он работает сам, без подключения к WorkTask."
    >
      {ruleSets.isLoading ? (
        <SkeletonLine height={40} />
      ) : !hasRuleSets ? (
        <Typography variant="body2" color="text.secondary">
          Выгружать пока нечего: у проекта нет ни одного набора правил. Импортируйте
          эталонный набор или создайте свой в разделе выше.
        </Typography>
      ) : (
        <Stack gap={2}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button
              variant="contained"
              disabled={exportFile.isPending}
              onClick={() => void generate()}
              sx={{ textTransform: 'none' }}
            >
              {file ? 'Сформировать заново' : 'Сформировать AGENTS.md'}
            </Button>
            {file && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={download}
                  sx={{ textTransform: 'none' }}
                >
                  Скачать
                </Button>
                <Button
                  variant="text"
                  startIcon={<ContentCopyOutlinedIcon />}
                  onClick={copy}
                  sx={{ textTransform: 'none' }}
                >
                  Скопировать
                </Button>
              </>
            )}
          </Stack>

          {file && (
            <Stack gap={1}>
              <Typography variant="body2" color="text.secondary">
                Правил в файле: {file.rulesCount}. Файл помечен как сгенерированный —
                менять правила нужно здесь, а не в нём, иначе правки потеряются при
                следующей выгрузке.
              </Typography>
              <Box
                component="pre"
                aria-label="Предпросмотр AGENTS.md"
                sx={{
                  m: 0,
                  p: 1.5,
                  maxHeight: 320,
                  overflow: 'auto',
                  fontSize: 12,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid var(--wt-border)',
                  borderRadius: 2,
                  bgcolor: 'var(--wt-field)',
                }}
              >
                {file.content}
              </Box>
            </Stack>
          )}
        </Stack>
      )}
    </SettingsSection>
  )
}
