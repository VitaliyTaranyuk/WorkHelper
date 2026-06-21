import type { ProjectDto } from '@/data-contracts'
import type { ProjectInfo } from './type'
import { mapUserShortDataDtoToUserWithEmail } from '../user/mapDTO'

export function mapProjectDtoToProjectInfo(
  projectDTO: ProjectDto,
): ProjectInfo {
  return {
    ...projectDTO,
    statuses: projectDTO.statuses || [],
    // TODO: попросить бекенд привести к однообразию, чтобы везде было либо ? либо точно есть имя и фамилия
    users: projectDTO.users?.map(mapUserShortDataDtoToUserWithEmail) || [],
  }
}
