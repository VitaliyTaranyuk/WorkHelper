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

export const ProjectBlock = () => {
  const { activeProject, isLoading, userProjects } = useProjectData()
  const changeProject = useChangeProject()

  return (
    <ProjectBlockContainer>
      <TitleText>Мои проекты</TitleText>
      <Loader isLoading={isLoading}>
        <ProjectList>
          {userProjects && userProjects.length > 0 ? (
            userProjects.map((project) => (
              <ProjectListItem key={project.id}>
                <ProjectLink
                  to="/main"
                  onClick={() =>
                    changeProject.mutate({ projectId: project.id })
                  }
                  isCurrent={activeProject?.id === project.id}
                >
                  {project.name}
                </ProjectLink>
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
