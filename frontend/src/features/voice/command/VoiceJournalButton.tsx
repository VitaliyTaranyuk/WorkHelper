import { useState } from 'react'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import Popover from '@mui/material/Popover'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import HistoryIcon from '@mui/icons-material/History'
import UndoIcon from '@mui/icons-material/Undo'
import { router } from '@/application/router'
import { notify as toast } from '@/shared/ui/notify'
import { useVoiceJournal, type JournalEntry } from './voiceJournal'

/**
 * Журнал голосовых действий (ТП-103 / X2): кнопка-история рядом с микрофоном,
 * открывает список последних команд сессии с откатом (где поддерживается).
 * Скрыта, пока журнал пуст.
 */
export function VoiceJournalButton() {
  const entries = useVoiceJournal((s) => s.entries)
  const markUndone = useVoiceJournal((s) => s.markUndone)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  if (entries.length === 0) return null

  const handleUndo = async (entry: JournalEntry) => {
    if (!entry.undo) return
    try {
      await entry.undo()
      markUndone(entry.id)
      toast.success('Действие отменено')
    } catch {
      toast.error('Не удалось отменить действие')
    }
  }

  return (
    <>
      <Tooltip title="Журнал голосовых команд" placement="left">
        <Fab
          size="small"
          color="default"
          aria-label="Журнал голосовых команд"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            position: 'fixed',
            bottom: 88,
            right: 24,
            zIndex: (t) => t.zIndex.snackbar - 1,
          }}
        >
          <HistoryIcon />
        </Fab>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, width: 340, maxHeight: 420, overflowY: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            История голосовых команд
          </Typography>
          {entries.map((entry) => (
            <Box
              key={entry.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.75,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  flexGrow: 1,
                  textDecoration: entry.undone ? 'line-through' : 'none',
                  color: entry.undone ? 'text.disabled' : 'text.primary',
                }}
              >
                {entry.message}
              </Typography>
              {entry.taskCode && (
                <Button
                  size="small"
                  onClick={() => {
                    setAnchor(null)
                    router.navigate({
                      to: '/task/$code',
                      params: { code: entry.taskCode as string },
                    })
                  }}
                >
                  Открыть
                </Button>
              )}
              {entry.undo && (
                <Tooltip title="Отменить">
                  <IconButton
                    size="small"
                    aria-label="Отменить действие"
                    onClick={() => handleUndo(entry)}
                  >
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  )
}
