import axios, { type AxiosInstance } from 'axios'
import { API_ENDPOINT_PATH } from '../../shared/api/endpointPath'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../../shared/api/token'
import { buildApiUrl } from '../../shared/api/workTechHttpClient'
import type { LoginResponseDTO } from '../../data-contracts'

export function addWorkTechApiAuthMiddleware(workTechApi: AxiosInstance) {
  workTechApi.interceptors.request.use(
    (config) => {
      const accessToken = getAccessToken()
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  workTechApi.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      // Если статус ошибки — 401 и нет флага originalRequest._retry,
      // это означает, что токен истек и нам нужно его обновить
      if (error.response.status === 401 && !originalRequest._retry) {
        const refreshToken = getRefreshToken()

        if (!refreshToken) {
          clearTokens()
          window.location.href = '/login'
          return Promise.reject(error)
        }

        originalRequest._retry = true

        try {
          // делаем запрос специально на отдельном инстансе axios, в котором нет перехватчика на ошибку, чтобы не зациклиться
          const response = await axios.post<LoginResponseDTO>(
            buildApiUrl(API_ENDPOINT_PATH.AUTH.REFRESH_TOKEN()),
            {
              refreshToken,
            },
          )
          const { data } = response

          if (!data.accessToken || !data.refreshToken) {
            clearTokens()
            throw new Error('no tokens in response on refresh')
          }

          saveAccessToken(response.data.accessToken!)
          saveRefreshToken(response.data.refreshToken!)

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken!}`
          return axios(originalRequest)
        } catch {
          clearTokens()
          window.location.href = '/login'
          return Promise.reject(new Error('session expired'))
        }
      }

      return Promise.reject(error)
    },
  )
}
