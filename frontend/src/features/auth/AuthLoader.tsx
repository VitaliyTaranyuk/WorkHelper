import { useEffect } from 'react'
import { useAuthStore } from './authStore'
import { Loader } from '@/shared/ui/components/Loader'

export function AuthLoader({ children }: { children: React.ReactNode }) {
  const authStore = useAuthStore()

  useEffect(() => {
    authStore.getCurrentUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <Loader isLoading={authStore.isLoading}>{children}</Loader>
}
