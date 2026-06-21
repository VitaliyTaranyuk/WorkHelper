import type { SprintInfoDTO } from '@/data-contracts'

export const MOCKED_PROJECT_ID = '123'

export const MOCKED_BACKLOG: SprintInfoDTO = {
  id: '111111',
  name: 'backlog',
  creator: {
    email: 'email',
    firstName: 'asd',
    lastName: 'sadf',
    gender: 'male',
    id: '123',
  },
  active: true,
  defaultSprint: true,
}

export const MOCKED_ACTIVE_SPRINT: SprintInfoDTO = {
  id: '2222',
  name: 'active sprint',
  creator: {
    email: 'email',
    firstName: 'asd',
    lastName: 'sadf',
    gender: 'male',
    id: '123',
  },
  active: true,
  defaultSprint: false,
}
