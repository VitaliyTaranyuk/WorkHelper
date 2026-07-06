import type { ReactElement, ReactNode } from 'react'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * Карточка-секция настроек (ТП-150): единый вид всех блоков раздела —
 * тот же визуальный язык, что у карточек доски и панелей карточки задачи
 * (скругление, рамка, спокойный фон), токены темы — корректно в тёмной.
 * Новая секция настроек = этот компонент, а не свой вёрсточный диалект.
 */
export function SettingsSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactElement
  title: string
  /** Короткое пояснение под заголовком. */
  description?: string
  /** Действие справа в шапке секции (кнопка). */
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <Paper
      variant="outlined"
      component="section"
      sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper' }}
    >
      <Stack direction="row" alignItems="flex-start" gap={1.25}>
        <Box sx={{ color: 'text.secondary', display: 'flex', mt: '2px' }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Paper>
  )
}
