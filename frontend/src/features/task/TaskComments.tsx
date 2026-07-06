import { useState } from 'react'
import {
  Button,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  useCreateComment,
  useDeleteComment,
  useTaskComments,
} from './useTaskComments'
import { MentionTextField } from '@/features/user/MentionTextField'
import { DictationButton } from '@/features/voice/DictationButton'
import { formatUserName } from '@/entities/user/utils'

type Props = { projectId: string; taskId: string }

export function TaskComments({ projectId, taskId }: Props) {
  const { data: comments } = useTaskComments({ projectId, taskId })
  const createComment = useCreateComment(projectId, taskId)
  const deleteComment = useDeleteComment(projectId, taskId)
  const [text, setText] = useState('')

  const submit = async () => {
    const value = text.trim()
    if (!value) return
    await createComment.mutateAsync(value)
    setText('')
  }

  // ТП-73: без дублирующего заголовка (вкладка уже «Комментарии») и лишнего
  // верхнего отступа — высота определяется содержимым, поле ввода сверху.
  return (
    <Stack gap={1.5}>
      <Stack direction="row" gap={1} alignItems="flex-start">
        <MentionTextField
          size="small"
          fullWidth
          placeholder="Добавить комментарий — введите @ для упоминания"
          value={text}
          onChange={setText}
          multiline
          maxRows={6}
        />
        {/* ТП-88: диктовка комментария голосом — текст добавляется в поле. */}
        <DictationButton
          field="comment"
          targetLabel="комментарий"
          onText={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))}
        />
        <Button
          variant="contained"
          disabled={!text.trim() || createComment.isPending}
          onClick={submit}
        >
          Отправить
        </Button>
      </Stack>

      <Stack gap={1}>
        {(comments ?? []).length === 0 && (
          <Typography color="text.secondary" variant="body2">
            Пока нет комментариев
          </Typography>
        )}
        {/* ТП-45: свежие комментарии сверху (API отдаёт старые -> новые) */}
        {[...(comments ?? [])].reverse().map((c) => (
          <Stack
            key={c.commentId}
            direction="row"
            alignItems="flex-start"
            gap={1}
            sx={{ p: 1.25, borderRadius: 2, backgroundColor: 'var(--wt-accent-soft)' }}
          >
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                {formatUserName(c.user)}
                {c.createdAt
                  ? ` · ${new Date(c.createdAt).toLocaleString('ru-RU')}`
                  : ''}
              </Typography>
              <Typography
                variant="body2"
                component="div"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {renderWithMentions(c.comment ?? '')}
              </Typography>
            </Stack>
            {c.commentId && (
              <IconButton
                size="small"
                aria-label="Удалить комментарий"
                onClick={() => deleteComment.mutate(c.commentId!)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}

/**
 * Подсвечивает @username-токены в тексте комментария. Не превращает в ссылку
 * (на фронте нет публичной user-страницы), но визуально выделяет, чтобы не
 * сливалось с обычным текстом — стандарт Linear/Slack/Jira.
 */
function renderWithMentions(text: string) {
  const parts: Array<string | { mention: string }> = []
  // Тот же regex, что и backend (Unicode-aware).
  const re = /@([\p{L}\p{N}._-]{2,32})/gu
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ mention: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((p, i) =>
    typeof p === 'string' ? (
      <span key={i}>{p}</span>
    ) : (
      <span
        key={i}
        style={{
          color: 'var(--wt-accent)',
          fontWeight: 500,
          backgroundColor: 'var(--wt-accent-soft)',
          padding: '0 4px',
          borderRadius: 4,
        }}
      >
        @{p.mention}
      </span>
    ),
  )
}
