import { useProjectData } from '@/features/project/query/useProjectData'
import {
  ProjectBlockContainer,
  ProjectList,
  EmptyList,
  TitleText,
} from './styles'
import { Loader } from '@/shared/ui/components/Loader'
import { useModal } from '@ebay/nice-modal-react'
import { CreateProjectModal } from '@/widget/modal/project/CreateProjectModal'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import { ProjectSidebarItem } from './ProjectSidebarItem'

export const ProjectBlock = () => {
  const { activeProject, isLoading, userProjects } = useProjectData()
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
              <ProjectSidebarItem
                key={project.id}
                project={project}
                isCurrent={activeProject?.id === project.id}
              />
            ))
          ) : (
            <EmptyList>Список пуст</EmptyList>
          )}
        </ProjectList>
      </Loader>
    </ProjectBlockContainer>
  )
}
