import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ClickAwayListener,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  TextField,
  Typography,
} from '@mui/material'
import type { TextFieldProps } from '@mui/material/TextField'
import { useUserPicker, type UserPickerItem } from './useUserPicker'
import { formatUserName } from '@/entities/user/utils'

type Props = Omit<TextFieldProps, 'onChange' | 'value' | 'inputRef'> & {
  value: string
  onChange: (next: string) => void
}

/**
 * TextField с @mention автокомплитом.
 *
 * UX по образцу Linear/Slack/Jira:
 *  - ввод "@" открывает popover рядом с курсором;
 *  - сразу подгружается список пользователей через useUserPicker (единый
 *    backend-источник /users/picker — те же активные пользователи, что в
 *    assignee picker, без отдельных копий/моков);
 *  - дальнейшие символы фильтруют список (debounce 150 ms, backend-side
 *    поиск по firstName/lastName/displayName/username/email);
 *  - выбор мышью или клавиатурой (↑/↓/Enter), Escape закрывает;
 *  - вставляется "@username " вместо "@мак" — backend парсит regex и
 *    создаёт MENTION-уведомление по username.
 */
export function MentionTextField({ value, onChange, ...rest }: Props) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [mention, setMention] = useState<{
    start: number
    query: string
  } | null>(null)
  const [highlight, setHighlight] = useState(0)

  const debouncedQuery = useDebouncedValue(mention?.query ?? '', 150)
  const { data: users } = useUserPicker(mention ? debouncedQuery : '')
  const items = useMemo(() => users ?? [], [users])

  // Сброс highlight при изменении списка
  useEffect(() => {
    setHighlight(0)
  }, [items.length])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = e.target.value
    onChange(next)
    const cursor = e.target.selectionStart ?? next.length
    const m = detectMention(next, cursor)
    setMention(m)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!mention || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + items.length) % items.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const user = items[highlight]
      if (user) insertMention(user)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMention(null)
    }
  }

  const insertMention = (user: UserPickerItem) => {
    if (!mention) return
    const u = user.username || ''
    if (!u) return // защита: нельзя упомянуть пользователя без username
    // Заменяем @<query> на @<username>+пробел
    const before = value.slice(0, mention.start)
    const cursorAfter = inputRef.current?.selectionStart ?? value.length
    const after = value.slice(cursorAfter)
    const inserted = `@${u} `
    const next = before + inserted + after
    onChange(next)
    setMention(null)
    requestAnimationFrame(() => {
      const newPos = before.length + inserted.length
      const el = inputRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(newPos, newPos)
      }
    })
  }

  const open = Boolean(mention) && items.length > 0

  return (
    <div ref={anchorRef} style={{ width: '100%' }}>
      <TextField
        {...rest}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        inputRef={(el) => (inputRef.current = el)}
      />
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ zIndex: 1500 }}
      >
        <ClickAwayListener onClickAway={() => setMention(null)}>
          <Paper elevation={3} sx={{ maxHeight: 260, overflowY: 'auto', mt: 0.5, minWidth: 240 }}>
            <List dense>
              {items.map((u, idx) => (
                <ListItemButton
                  key={u.id}
                  selected={idx === highlight}
                  onMouseDown={(e) => {
                    e.preventDefault() // не терять фокус
                    insertMention(u)
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        {formatUserName(u)}
                      </Typography>
                    }
                    secondary={
                      u.username ? `@${u.username}` : u.email
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </div>
  )
}

/**
 * Возвращает {start, query} если курсор находится внутри @токена (нет пробелов
 * между @ и курсором), иначе null.
 */
function detectMention(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  if (cursor <= 0) return null
  // Идём назад от курсора до @, ограничивая длиной 33 (32 max username + @)
  const segmentStart = Math.max(0, cursor - 33)
  const segment = text.slice(segmentStart, cursor)
  const m = /@([\p{L}\p{N}._-]{0,32})$/u.exec(segment)
  if (!m) return null
  // Проверим что перед @ — начало или пробел/перевод строки (иначе это часть email-а)
  const atIdx = segmentStart + m.index
  if (atIdx > 0) {
    const prev = text[atIdx - 1]
    if (prev && !/\s/.test(prev)) return null
  }
  return { start: atIdx, query: m[1] }
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
