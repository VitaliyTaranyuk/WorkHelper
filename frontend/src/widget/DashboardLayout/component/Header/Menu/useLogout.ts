import { useAuthStore } from '@/features/auth/authStore'
import { useNavigate } from '@tanstack/react-router'

export const useLogout = () => {
  const navigate = useNavigate()
  const logout = useAuthStore((store) => store.logout)

  const handleLogout = async () => {
    try {
      await logout()
      navigate({ to: '/login' })
    } catch (e) {
      console.error('Ошибка при выходе из аккаунта', e)
    }
  }

  return handleLogout
}
