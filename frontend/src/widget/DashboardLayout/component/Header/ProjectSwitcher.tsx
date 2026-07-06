import { useRef, useState } from 'react'
import {
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import { useModal } from '@ebay/nice-modal-react'
import { useNavigate } from '@tanstack/react-router'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useChangeProject } from '@/features/project/mutation/useChangeProject'
import { useDeleteProject } from '@/features/project/mutation/useProjectActions'
import { CreateProjectModal } from '@/widget/modal/project/CreateProjectModal'
import { EditProjectModal } from '@/widget/modal/project/EditProjectModal'
import { InviteUsersModal } from '@/widget/modal/project/InviteUsersModal'
import { ProjectHistoryModal } from '@/widget/modal/project/ProjectHistoryModal'
import { COLOR } from '@/shared/ui/theme/constants'

/**
 * Проект — главный объект рабочего пространства (ТП-54, паттерн
 * Linear/ClickUp workspace switcher): логотип + название текущего проекта
 * в верхней части боковой панели, по клику — меню действий проекта
 * (редактирование, участники, история, удаление) и переключение/создание
 * проектов. Название обновляется автоматически (реактивные данные проекта).
 */
export function ProjectSwitcher() {
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)

  const navigate = useNavigate()
  const { activeProject, userProjects } = useProjectData()
  const changeProject = useChangeProject()
  const deleteProject = useDeleteProject()

  const editModal = useModal(EditProjectModal)
  const inviteModal = useModal(InviteUsersModal)
  const historyModal = useModal(ProjectHistoryModal)
  const createModal = useModal(CreateProjectModal)

  const close = () => setOpen(false)

  const switchTo = (projectId: string) => {
    close()
    if (projectId !== activeProject?.id) {
      changeProject.mutate({ projectId })
      navigate({ to: '/main' })
    }
  }

  const removeProject = () => {
    if (!activeProject) return
    close()
    if (
      window.confirm(
        `Удалить проект «${activeProject.name}»? Проект будет помечен удалённым.`,
      )
    ) {
      deleteProject.mutate(activeProject.id)
    }
  }

  const otherProjects = userProjects ?? []

  return (
    <>
      <Button
        ref={anchorRef}
        onClick={() => setOpen(true)}
        endIcon={<ExpandMoreIcon />}
        sx={{
          textTransform: 'none',
          color: COLOR.text.active,
          maxWidth: '100%',
          justifyContent: 'flex-start',
          px: 1,
        }}
        aria-label="Меню проекта"
      >
        <LogoMark />
        <Typography
          noWrap
          // ТП-134 (F-011): на телефоне боковой блок сжат до логотипа —
          // название проекта скрыто, чтобы не выталкивать шапку.
          sx={{
            fontSize: 17,
            fontWeight: 600,
            ml: 1,
            '@media (max-width: 640px)': { display: 'none' },
          }}
          title={activeProject?.name}
        >
          {activeProject?.name ?? 'WorkTask'}
        </Typography>
      </Button>

      <Menu
        open={open}
        anchorEl={anchorRef.current}
        onClose={close}
        slotProps={{ paper: { sx: { width: 300 } } }}
      >
        {activeProject && [
          <MenuItem
            key="edit"
            onClick={() => {
              close()
              editModal.show({
                projectId: activeProject.id,
                name: activeProject.name,
                code: activeProject.code,
                description: activeProject.description,
              })
            }}
          >
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Редактировать проект…" />
          </MenuItem>,
          <MenuItem
            key="invite"
            onClick={() => {
              close()
              inviteModal.show()
            }}
          >
            <ListItemIcon>
              <PersonAddAltIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Пригласить в проект…" />
          </MenuItem>,
          <MenuItem
            key="history"
            onClick={() => {
              close()
              historyModal.show({ projectId: activeProject.id })
            }}
          >
            <ListItemIcon>
              <HistoryOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="История проекта" />
          </MenuItem>,
          <MenuItem key="delete" onClick={removeProject}>
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Удалить проект"
              slotProps={{ primary: { color: 'error' } }}
            />
          </MenuItem>,
          <Divider key="divider" />,
        ]}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 2, py: 0.5, display: 'block' }}
        >
          Проекты
        </Typography>
        {otherProjects.map((project) => (
          <MenuItem key={project.id} onClick={() => switchTo(project.id)}>
            <ListItemIcon>
              {project.id === activeProject?.id && <CheckIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={project.name} />
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            close()
            createModal.show()
          }}
        >
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Создать проект…" />
        </MenuItem>
      </Menu>
    </>
  )
}

/** Компактный логотип приложения рядом с названием проекта. */
function LogoMark() {
  return (
    <span
      aria-label="WorkTask"
      title="WorkTask"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 8,
        flexShrink: 0,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: '#fff',
        fontSize: 15,
        fontWeight: 700,
      }}
    >
      W
    </span>
  )
}
