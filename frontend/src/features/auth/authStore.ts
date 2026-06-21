import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  clearTokens,
  getAccessToken,
  saveAccessToken,
  saveRefreshToken,
} from '../../shared/api/token'
import type { RegisterDTO } from '../../data-contracts'
import { workTechApi } from '../../shared/api/endpoint'
import type { FullUserData } from '@/entities/user/types'
import { mapUserDataDtoToFullUserData } from '@/entities/user/mapDTO'

export interface AuthState {
  isAuthenticated: boolean
  user: FullUserData | null
  isLoading: boolean
  login: ({
    userName,
    password,
  }: {
    userName: string
    password: string
  }) => Promise<void>
  register: (data: RegisterDTO) => Promise<void>
  logout: () => void
  getCurrentUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set): AuthState => ({
      isAuthenticated: false,
      user: null,
      isLoading: true,

      getCurrentUser: async () => {
        const token = getAccessToken()

        if (!token) {
          set({ isLoading: false })
          return
        }

        try {
          const response = await workTechApi.user.getUserProfile()

          if (response.data) {
            set({
              user: mapUserDataDtoToFullUserData(response.data),
              isAuthenticated: true,
            })
          } else {
            clearTokens()
            set({ user: null, isAuthenticated: false })
          }
        } catch (e) {
          console.log(e)
          clearTokens()
          set({ user: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },

      login: async ({
        userName,
        password,
      }: {
        userName: string
        password: string
      }) => {
        const loginResponse = await workTechApi.auth.authenticateUser({
          data: { email: userName, password },
        })

        if (loginResponse.status < 200 || loginResponse.status >= 400) {
          throw new Error('Authentication failed')
        }

        saveAccessToken(loginResponse.data.accessToken!)
        saveRefreshToken(loginResponse.data.refreshToken!)

        const userResponse = await workTechApi.user.getUserProfile()

        if (userResponse.status >= 200 && userResponse.status < 300) {
          set({
            user: mapUserDataDtoToFullUserData(userResponse.data),
            isAuthenticated: true,
          })
        } else {
          throw new Error('Authentication failed')
        }
      },

      register: async (data: RegisterDTO) => {
        await workTechApi.registration.registerUser({
          data,
        })
      },

      logout: async () => {
        await workTechApi.auth.logout()
        set({ user: null, isAuthenticated: false })
        clearTokens()
      },
    }),
    {
      name: 'auth-store',
    },
  ),
)

export const userSelector = (state: AuthState) => state.user
