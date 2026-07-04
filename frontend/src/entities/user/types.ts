export type User = {
  id: string
  lastName: string
  firstName: string
}

export type UserWithAvatar = User & {
  avatarUrl?: string
}

export type UserWithEmail = User & {
  email: string
}

export type FullUserData = UserWithEmail & {
  lastProjectId?: string
  middleName?: string
  phone?: string
  birthDate?: string
  active?: boolean
  displayName?: string
  username?: string
}
