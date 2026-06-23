import { useChangeProject } from '@/features/project/mutation/useChangeProject'
import { useDeleteProject } from '@/features/project/mutation/useProjectActions'
import { useActiveSprintQuery } from '@/features/sprint/query/useActiveSprintQuery'
import { getFormattedDateRange } from '@/shared/utils/date'
import { SPRINT_STATUS_COLOR } from '@/entities/sprint/status'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  ProjectListItem,
  ProjectLink,
  SubLink,
  SubLinkMuted,
  SprintStatusDot,
} from './styles'

type ProjectSidebarItemProps = {
  project: { id: string; name: string }
  isCurrent: boolean
}

/**
 * Один проект в сайдбаре: название (→ доска), строка активного спринта
 * (→ управление спринтами проекта) и ссылка на Backlog проекта.
 *
 * Активный спринт грузится отдельным запросом на проект — поэтому вынесено
 * в дочерний компонент (правила хуков не позволяют вызывать useQuery в цикле).
 */
export function ProjectSidebarItem({
  project,
  isCurrent,
}: ProjectSidebarItemProps) {
  const changeProject = useChangeProject()
  const deleteProject = useDeleteProject()
  const { data: activeSprint } = useActiveSprintQuery(project.id)

  const sprintDateRange =
    activeSprint?.startDate && activeSprint?.endDate
      ? getFormattedDateRange({
          start: activeSprint.startDate,
          end: activeSprint.endDate,
        })
      : ''

  const sprintLabel = activeSprint
    ? [activeSprint.name, sprintDateRange].filter(Boolean).join(' · ')
    : ''

  return (
    <ProjectListItem>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <ProjectLink
          to="/main"
          onClick={() => changeProject.mutate({ projectId: project.id })}
          isCurrent={isCurrent}
          style={{ flex: 1 }}
        >
          {project.name}
        </ProjectLink>
        <IconButton
          size="small"
          aria-label="Удалить проект"
          onClick={() => {
            if (
              window.confirm(
                `Удалить проект «${project.name}»? Проект будет помечен удалённым.`,
              )
            ) {
              deleteProject.mutate(project.id)
            }
          }}
        >
          <DeleteOutlineIcon fontSize="inherit" />
        </IconButton>
      </div>

      {activeSprint ? (
        <SubLink
          to={`/project/${project.id}/sprint`}
          onClick={() => changeProject.mutate({ projectId: project.id })}
          title="Открыть спринты проекта"
        >
          <SprintStatusDot
            color={SPRINT_STATUS_COLOR[activeSprint.status]}
          />
          {sprintLabel}
        </SubLink>
      ) : (
        <SubLinkMuted
          to={`/project/${project.id}/sprint`}
          onClick={() => changeProject.mutate({ projectId: project.id })}
          title="Нет активного спринта — открыть спринты"
        >
          Нет активного спринта
        </SubLinkMuted>
      )}

      <SubLink
        to={`/project/${project.id}/backlog`}
        onClick={() => changeProject.mutate({ projectId: project.id })}
        title="Открыть Backlog проекта"
      >
        Backlog
      </SubLink>
    </ProjectListItem>
  )
}
