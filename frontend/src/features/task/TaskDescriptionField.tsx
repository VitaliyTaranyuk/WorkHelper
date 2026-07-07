import { Stack, Typography } from '@mui/material'
import type { UseFormReturn } from 'react-hook-form'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { FormCaption } from '@/shared/ui/components/FormCaption'
import { DictationButton } from '@/features/voice/DictationButton'
import type { FormValues } from './TaskForm/useTaskForm'


/**
 * Поле «Описание» задачи с панелью вспомогательных инструментов (ТП-119).
 * Единый компонент для карточек создания и редактирования — одинаковый UX,
 * стиль и расположение элементов, без дублирования.
 *
 * Расположение по практике composer-редакторов (GitHub/Slack/X): под полем —
 * панель инструментов, где слева диктовка (голосовой ввод описания), справа —
 * счётчик символов. Диктовка убрана из области названия: голосом вводится
 * содержательный текст (описание/комментарии), а не короткий заголовок.
 * Бизнес-логика диктовки не меняется — только расположение и стиль.
 */
export function TaskDescriptionField({
  form,
}: {
  form: UseFormReturn<FormValues>
}) {
  const value = form.watch('description') ?? ''
  const error = form.formState.errors.description

  const appendDictation = (text: string) => {
    const current = form.getValues('description') ?? ''
    form.setValue('description', current ? `${current}\n${text}` : text, {
      shouldDirty: true,
    })
  }

  return (
    <Stack gap={0.5}>
      <FormCaption>Описание</FormCaption>
      {/* Большие тексты (тех. задания, 500+ строк) читаемы/редактируемы:
          минимум 8 строк, рост до 24, дальше — внутренний скролл (Jira/Linear). */}
      <TextField
        fullWidth
        multiline
        minRows={8}
        maxRows={24}
        // ТП-187: лимит 4096 снят (колонка TEXT) — длинные тексты (промпты,
        // ТЗ на десятки тысяч символов) вставляются как есть, без maxLength.
        slotProps={{
          htmlInput: {
            style: { overflowY: 'auto', resize: 'vertical' },
          },
        }}
        sx={{
          '& .MuiInputBase-root': { padding: '12px 11px' },
          '& textarea': {
            lineHeight: 1.5,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 13,
          },
        }}
        error={Boolean(error)}
        helperText={error?.message}
        {...form.register('description')}
        placeholder="Опишите задачу — поддерживаются длинные тексты и переносы строк"
      />
      {/* Панель инструментов поля: слева диктовка, справа счётчик символов —
          информационный, без потолка (лимит снят в ТП-187, как в Jira/Linear). */}
      <Stack direction="row" alignItems="center" gap={1}>
        <DictationButton targetLabel="описание" onText={appendDictation} />
        {value.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {value.length.toLocaleString('ru-RU')} символов
          </Typography>
        )}
      </Stack>
    </Stack>
  )
}
