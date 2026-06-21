import {
  ANALYTIC_USERS,
  BACKEND_USERS,
  DESIGN_USERS,
  FRONTEND_USERS,
  QA_USERS,
} from '@/config'
import { makeFilterAssignees } from './utils'

export const STATIC_FILTER = {
  frontend: makeFilterAssignees(FRONTEND_USERS),
  backend: makeFilterAssignees(BACKEND_USERS),
  analytic: makeFilterAssignees(ANALYTIC_USERS),
  design: makeFilterAssignees(DESIGN_USERS),
  test: makeFilterAssignees(QA_USERS),
} as const
