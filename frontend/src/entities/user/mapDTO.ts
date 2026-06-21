import type { UserDataDto, UserShortDataDto } from '@/data-contracts'
import type { FullUserData, UserWithEmail } from './types'

export function mapUserShortDataDtoToUserWithEmail(
  userDTO: UserShortDataDto,
): UserWithEmail {
  return {
    // TODO: исправить `|| ''` когда бекенд поправит типы (пользователь не может без фамилии)
    lastName: userDTO.lastName || '',
    ...userDTO,
  }
}

export function mapUserDataDtoToFullUserData(
  userDTO: UserDataDto,
): FullUserData {
  return {
    ...userDTO,
    id: userDTO.userId,
  }
}
