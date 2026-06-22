import { useState } from 'react'
import {
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  useCreateComment,
  useDeleteComment,
  useTaskComments,
} from './useTaskComments'

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

  return (
    <Stack gap={1.5} mt={3}>
      <Typography variant="subtitle1" fontWeight={600}>
        Комментарии
      </Typography>

      <Stack direction="row" gap={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Добавить комментарий (@username — упоминание)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          maxRows={4}
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
        {(comments ?? []).map((c) => (
          <Stack
            key={c.commentId}
            direction="row"
            alignItems="flex-start"
            gap={1}
            sx={{ p: 1.25, borderRadius: 2, backgroundColor: 'rgba(99,102,241,0.06)' }}
          >
            <Stack sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {c.user ? `${c.user.firstName} ${c.user.lastName ?? ''}` : ''}
                {c.createdAt
                  ? ` · ${new Date(c.createdAt).toLocaleString('ru-RU')}`
                  : ''}
              </Typography>
              <Typography variant="body2">{c.comment}</Typography>
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
