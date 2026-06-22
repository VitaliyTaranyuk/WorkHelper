import { useProjectData } from '@/features/project/query/useProjectData'
import {
  ProjectBlockContainer,
  ProjectList,
  ProjectListItem,
  EmptyList,
  TitleText,
  ProjectLink,
  SprintLink,
} from './styles'
import { Loader } from '@/shared/ui/components/Loader'
import { useChangeProject } from '@/features/project/mutation/useChangeProject'
import { useDeleteProject } from '@/features/project/mutation/useProjectActions'
import { useModal } from '@ebay/nice-modal-react'
import { CreateProjectModal } from '@/widget/modal/project/CreateProjectModal'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

export const ProjectBlock = () => {
  const { activeProject, isLoading, userProjects } = useProjectData()
  const changeProject = useChangeProject()
  const deleteProject = useDeleteProject()
  const createModal = useModal(CreateProjectModal)

  return (
    <ProjectBlockContainer>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px 0 32px',
        }}
      >
        <TitleText style={{ padding: 0 }}>Мои проекты</TitleText>
        <Button
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => createModal.show()}
          sx={{ minWidth: 0, textTransform: 'none' }}
        >
          Проект
        </Button>
      </div>
      <Loader isLoading={isLoading}>
        <ProjectList>
          {userProjects && userProjects.length > 0 ? (
            userProjects.map((project) => (
              <ProjectListItem key={project.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ProjectLink
                    to="/main"
                    onClick={() =>
                      changeProject.mutate({ projectId: project.id })
                    }
                    isCurrent={activeProject?.id === project.id}
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
                <SprintLink to={`/project/${project.id}/sprint`}>
                  Спринты
                </SprintLink>
              </ProjectListItem>
            ))
          ) : (
            <EmptyList>Список пуст</EmptyList>
          )}
        </ProjectList>
      </Loader>
    </ProjectBlockContainer>
  )
}
