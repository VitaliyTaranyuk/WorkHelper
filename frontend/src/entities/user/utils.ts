import type { User } from './types'

export function getFullName(user: Pick<User, 'lastName' | 'firstName'>) {
  return `${user.lastName} ${user.firstName}`
}
