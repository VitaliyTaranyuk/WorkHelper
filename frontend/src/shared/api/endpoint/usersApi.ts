import type {
  GetAllUsersData,
  GetUserData,
  GetGenderValuesData,
  UpdateUserData,
  UpdateUserRequest,
} from '../../../data-contracts'
import { API_ENDPOINT_PATH } from '../endpointPath'
import { workTechApiClient } from '../workTechHttpClient'
import type { RequestParams } from './type'

/**
 * @name GetAllUsers
 * @summary Получить всех пользователей
 * @request GET:/users
 */
export function getAllUsers({
  otherParams = {},
}: {
  otherParams?: RequestParams
} = {}) {
  return workTechApiClient<GetAllUsersData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.USERS.GET_ALL(),
    ...otherParams,
  })
}

/**
 * @name GetUser
 * @summary Получить профиль текущего пользователя
 * @request GET:/users/profile
 */
export function getUserProfile({
  otherParams = {},
}: {
  otherParams?: RequestParams
} = {}) {
  return workTechApiClient<GetUserData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.USERS.PROFILE(),
    ...otherParams,
  })
}

/** Серверные настройки уведомлений пользователя (ТП-65). */
export type UserSettingsDto = {
  notifyMentions: boolean
  notifyTaskCreated: boolean
  notifyMeetings: boolean
  reminderMinutes: number
}

/**
 * @name GetUserSettings
 * @summary Настройки уведомлений текущего пользователя
 * @request GET:/users/settings
 */
export function getUserSettings({
  otherParams = {},
}: { otherParams?: RequestParams } = {}) {
  return workTechApiClient<UserSettingsDto>({
    method: 'GET',
    url: API_ENDPOINT_PATH.USERS.SETTINGS(),
    ...otherParams,
  })
}

/**
 * @name UpdateUserSettings
 * @summary Обновить настройки уведомлений
 * @request PUT:/users/settings
 */
export function updateUserSettings({
  data,
  otherParams = {},
}: {
  data: UserSettingsDto
  otherParams?: RequestParams
}) {
  return workTechApiClient<UserSettingsDto>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.USERS.SETTINGS(),
    data,
    ...otherParams,
  })
}

/** Минимальное редактирование профиля текущего пользователя (ТП-63). */
export type UpdateProfileRequest = {
  firstName: string
  lastName?: string
  displayName?: string
  username?: string
  phone?: string
}

/**
 * @name UpdateProfile
 * @summary Обновить профиль текущего пользователя
 * @request PUT:/users/profile
 */
export function updateProfile({
  data,
  otherParams = {},
}: {
  data: UpdateProfileRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<GetUserData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.USERS.PROFILE(),
    data,
    ...otherParams,
  })
}

/**
 * @name UpdateUser
 * @summary Обновить данные пользователя
 * @request PUT:/users/update
 */
export function updateUser({
  data,
  otherParams = {},
}: {
  data: UpdateUserRequest
  otherParams?: RequestParams
}) {
  return workTechApiClient<UpdateUserData>({
    method: 'PUT',
    url: API_ENDPOINT_PATH.USERS.UPDATE(),
    data,
    ...otherParams,
  })
}

/**
 * @name GetGenderValues
 * @summary Получить значения пола
 * @request GET:/users/gender-values
 */
export function getGenderValues({
  otherParams = {},
}: {
  otherParams?: RequestParams
} = {}) {
  return workTechApiClient<GetGenderValuesData>({
    method: 'GET',
    url: API_ENDPOINT_PATH.USERS.GENDER_VALUES(),
    ...otherParams,
  })
}
