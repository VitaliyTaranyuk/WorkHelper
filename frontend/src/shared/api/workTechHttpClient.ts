import axios, { type AxiosInstance } from 'axios'
import {
  WORKTECH_API_BASE_URL,
  WORKTECH_API_PREFIX,
  WORKTECH_API_VERSION,
} from '../../config'
import { ValidationError, isValidationErrorPayload } from './errors'

export const buildApiUrl = (endpoint: string): string => {
  return `${WORKTECH_API_BASE_URL}/${WORKTECH_API_PREFIX}/${WORKTECH_API_VERSION}${endpoint}`
}

export const workTechApiClient = axios.create({
  baseURL: buildApiUrl(''),
})

export function addWorkTechApiValidationMiddleware(
  workTechApiClient: AxiosInstance,
) {
  workTechApiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status
      const data = error?.response?.data

      if (status === 400 && isValidationErrorPayload(data)) {
        throw new ValidationError(data)
      }

      return Promise.reject(error)
    },
  )
}
