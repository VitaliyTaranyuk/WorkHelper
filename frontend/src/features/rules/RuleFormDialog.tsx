import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { TextField } from '@/shared/ui/mui/TextFileld'
import { modalStyle } from '@/shared/ui/modalStyles'
import type { RuleDto, RuleRequest } from '@/shared/api/endpoint/rulesApi'
import {
  KIND_OPTIONS,
  LEVEL_OPTIONS,
  STRENGTH_OPTIONS,
  VERIFICATION_OPTIONS,
  kindLabel,
  levelLabel,
  strengthLabel,
  verificationLabel,
} from './ruleLabels'

const EMPTY: RuleRequest = {
  code: '',
  level: 'CORE',
  kind: 'PROCEDURE',
  strength: 'MUST',
  triggerCondition: 'всегда',
  verification: 'MANUAL',
  body: '',
}

/**
 * T-511: форма правила.
 *
 * Диалог рендерится в месте использования, а не регистрируется в NiceModal:
 * ему нечего показывать «из любой точки приложения», он всегда открыт из своей
 * секции и живёт её состоянием. Router-хуков внутри нет по той же причине, что
 * и везде (**R-02**).
 *
 * Способ проверки — обязательное поле, а не необязательное: правило без способа
 * проверки это пожелание, и проект уже обжигался на гейтах, которых не
 * существует (T-106).
 */
export function RuleFormDialog({
  open,
  rule,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean
  /** `undefined` — создание нового правила. */
  rule?: RuleDto
  busy: boolean
  onClose: () => void
  onSubmit: (data: RuleRequest) => void
}) {
  const [form, setForm] = useState<RuleRequest>(EMPTY)

  useEffect(() => {
    if (!open) return
    setForm(
      rule
        ? {
            code: rule.code,
            level: rule.level,
            kind: rule.kind,
            strength: rule.strength,
            triggerCondition: rule.triggerCondition,
            verification: rule.verification,
            body: rule.body,
          }
        : EMPTY,
    )
  }, [open, rule])

  const set = (patch: Partial<RuleRequest>) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit =
    form.code.trim().length > 0 &&
    form.body.trim().length > 0 &&
    form.triggerCondition.trim().length > 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: modalStyle.modalContainer } }}
    >
      <DialogTitle sx={{ p: 0, fontSize: '22px', fontWeight: 500 }}>
        {rule ? 'Изменить правило' : 'Новое правило'}
      </DialogTitle>
      <DialogContent sx={modalStyle.modalContent}>
        <Stack gap={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField
              size="small"
              label="Код"
              placeholder="K-27"
              value={form.code}
              onChange={(e) => set({ code: e.target.value })}
              sx={{ minWidth: 130 }}
            />
            <TextField
              select
              size="small"
              label="Уровень"
              value={form.level}
              onChange={(e) => set({ level: e.target.value })}
              sx={{ flex: 1, minWidth: 140 }}
            >
              {LEVEL_OPTIONS.map((v) => (
                <MenuItem key={v} value={v}>
                  {levelLabel(v)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField
              select
              size="small"
              label="Тип"
              value={form.kind}
              onChange={(e) => set({ kind: e.target.value })}
              sx={{ flex: 1, minWidth: 140 }}
            >
              {KIND_OPTIONS.map((v) => (
                <MenuItem key={v} value={v}>
                  {kindLabel(v)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Сила"
              value={form.strength}
              onChange={(e) => set({ strength: e.target.value })}
              sx={{ minWidth: 130 }}
            >
              {STRENGTH_OPTIONS.map((v) => (
                <MenuItem key={v} value={v}>
                  {strengthLabel(v)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Проверка"
              value={form.verification}
              onChange={(e) => set({ verification: e.target.value })}
              sx={{ minWidth: 150 }}
            >
              {VERIFICATION_OPTIONS.map((v) => (
                <MenuItem key={v} value={v}>
                  {verificationLabel(v)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            size="small"
            label="Триггер"
            placeholder="всегда, багфикс, новая зависимость…"
            value={form.triggerCondition}
            onChange={(e) => set({ triggerCondition: e.target.value })}
          />

          <TextField
            multiline
            minRows={3}
            label="Формулировка"
            value={form.body}
            onChange={(e) => set({ body: e.target.value })}
            slotProps={{ input: { sx: { '& .MuiInputBase-input': { height: 'auto' } } } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit || busy}
          onClick={() =>
            onSubmit({
              ...form,
              code: form.code.trim(),
              triggerCondition: form.triggerCondition.trim(),
              body: form.body.trim(),
            })
          }
          sx={{ textTransform: 'none' }}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  )
}
