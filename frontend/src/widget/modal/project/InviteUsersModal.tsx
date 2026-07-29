import { useState } from 'react'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LinkIcon from '@mui/icons-material/Link'
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notify as toast } from '@/shared/ui/notify'
import { workTechApi } from '@/shared/api/endpoint'
import { useUserLookup, type UserLookupItem } from '@/features/user/useUserLookup'
import { useProjectData } from '@/features/project/query/useProjectData'
import { extractGeneralError } from '@/shared/api/extractFieldErrors'

export const InviteUsersModal = NiceModal.create(InviteUsersModalInner)

/**
 * Приглашение пользователей в проект (ТП-35, паттерн Trello/Notion):
 *  - вручную: поиск зарегистрированного пользователя по ТОЧНОМУ username или
 *    email и добавление. Точное совпадение — не придирка к UX: подстроковый
 *    поиск по всей базе был перечисляемым каталогом чужих учёток с email
 *    (TD-028), а ролью его не закрыть — владельцем проекта становится любой,
 *    кто создал проект;
 *  - по ссылке: одноразовая ссылка-приглашение, копируется в буфер;
 *    незарегистрированный получатель попадёт в проект сразу после
 *    регистрации. Каждое нажатие создаёт новую уникальную ссылку.
 */
function InviteUsersModalInner() {
  const modal = useModal()
  const { activeProject } = useProjectData()
  const queryClient = useQueryClient()

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<UserLookupItem | null>(null)
  const [inviteUrl, setInviteUrl] = useState('')
  const { data: users } = useUserLookup(query, activeProject?.id)

  const addUser = useMutation({
    mutationFn: (userId: string) =>
      workTechApi.project.addProjectForUsers({
        projectId: activeProject!.id,
        data: { ids: [userId] },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectData'] })
      toast.success('Пользователь добавлен в проект')
      setSelected(null)
    },
    onError: (err) =>
      toast.error(extractGeneralError(err) ?? 'Не удалось добавить пользователя'),
  })

  const createInvite = useMutation({
    mutationFn: () =>
      workTechApi.project.createInvite({ projectId: activeProject!.id }),
    onSuccess: async (res) => {
      const url = `${window.location.origin}/invite/${res.data.token}`
      setInviteUrl(url)
      await copyToClipboard(url)
    },
    onError: (err) =>
      toast.error(extractGeneralError(err) ?? 'Не удалось создать приглашение'),
  })

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Ссылка скопирована — действительна для одного пользователя')
    } catch {
      toast.info('Скопируйте ссылку вручную из поля ниже')
    }
  }

  const handleClose = () => {
    modal.hide()
  }

  return (
    <Dialog
      open={modal.visible}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      onTransitionExited={() => modal.remove()}
    >
      <DialogTitle sx={{ pr: 6 }}>Пригласить в проект</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={{ position: 'absolute', right: 12, top: 12 }}
        size="small"
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <DialogContent>
        <Stack gap={2.5}>
          <Stack gap={1}>
            <Stack direction="row" alignItems="center" gap={1}>
              <PersonAddAltIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle2">
                Добавить зарегистрированного пользователя
              </Typography>
            </Stack>
            <Stack direction="row" gap={1}>
              <Autocomplete
                size="small"
                sx={{ flex: 1 }}
                options={users ?? []}
                value={selected}
                onChange={(_, v) => setSelected(v)}
                inputValue={query}
                onInputChange={(_, v) => setQuery(v)}
                getOptionLabel={(o) =>
                  `${o.displayName || o.username} (@${o.username})`
                }
                isOptionEqualToValue={(o, v) => o.id === v.id}
                // Отбор делает backend по ТОЧНОМУ совпадению, поэтому подпись
                // варианта («Админ (@admin)») заведомо не содержит введённый
                // email — встроенный клиентский фильтр MUI выбросил бы
                // единственный найденный вариант, и поиск по почте выглядел бы
                // как «никто не найден». Найдено живой проверкой на проде.
                filterOptions={(options) => options}
                noOptionsText={
                  query.trim().length < 2
                    ? 'Введите @username или email целиком'
                    : 'Никто не найден — проверьте username или email, либо пригласите ссылкой'
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="@username или email целиком"
                    helperText="Поиск по точному совпадению — чужие учётки не перечисляются"
                  />
                )}
              />
              <Button
                variant="contained"
                disabled={!selected || addUser.isPending}
                onClick={() => selected && addUser.mutate(selected.id)}
              >
                Добавить
              </Button>
            </Stack>
          </Stack>

          <Divider>или</Divider>

          <Stack gap={1}>
            <Stack direction="row" alignItems="center" gap={1}>
              <LinkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle2">Пригласить по ссылке</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Ссылка действительна для одного пользователя. Если получатель ещё
              не зарегистрирован — он попадёт в проект сразу после регистрации.
              Каждое нажатие создаёт новую уникальную ссылку.
            </Typography>
            <Stack direction="row" gap={1}>
              <Button
                variant="outlined"
                onClick={() => createInvite.mutate()}
                disabled={createInvite.isPending}
                sx={{ textTransform: 'none', flexShrink: 0 }}
              >
                Создать ссылку и скопировать
              </Button>
              {inviteUrl && (
                <TextField
                  size="small"
                  fullWidth
                  value={inviteUrl}
                  onClick={() => copyToClipboard(inviteUrl)}
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: (
                        <IconButton
                          size="small"
                          aria-label="Скопировать ссылку"
                          onClick={() => copyToClipboard(inviteUrl)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      ),
                    },
                  }}
                />
              )}
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
