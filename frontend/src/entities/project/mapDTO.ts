import type { ProjectDto } from '@/data-contracts'
import type { ProjectInfo } from './type'
import { mapUserShortDataDtoToUserWithEmail } from '../user/mapDTO'

export function mapProjectDtoToProjectInfo(
  projectDTO: ProjectDto,
): ProjectInfo {
  return {
    ...projectDTO,
    // T-519: старый ответ без поля режима читается как «спринты» — тот же дефолт,
    // что на сервере. Дрейф контракта не должен превращать доску в Kanban (W-08).
    boardMode:
      (projectDTO as ProjectDto & { boardMode?: string }).boardMode || 'SPRINT',
    statuses: projectDTO.statuses || [],
    // TODO: попросить бекенд привести к однообразию, чтобы везде было либо ? либо точно есть имя и фамилия
    users: projectDTO.users?.map(mapUserShortDataDtoToUserWithEmail) || [],
  }
}
