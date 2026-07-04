import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from '@tanstack/react-router'
import NiceModal from '@ebay/nice-modal-react'
import { Toaster } from 'sonner'
import { router } from './application/router'
import { useAuthStore } from './features/auth/authStore'
import { AuthLoader } from './features/auth/AuthLoader'
import { addWorkTechApiAuthMiddleware } from './features/auth/apiMiddleware'
import { ThemeProvider } from './application/provider/ThemeProvider'
import {
  addWorkTechApiValidationMiddleware,
  workTechApiClient,
} from './shared/api/workTechHttpClient'
import { QueryProvider } from './application/provider/QueryProvider'

function InnerApp() {
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated)
  return <RouterProvider router={router} context={{ isAuthenticated }} />
}

addWorkTechApiAuthMiddleware(workTechApiClient)
// TODO: переделать обработку ошибки в обертке над workTechApiClient
addWorkTechApiValidationMiddleware(workTechApiClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <AuthLoader>
          <NiceModal.Provider>
            <InnerApp />
            {/* closeButton — ручное закрытие тостов (ТП-59) */}
            <Toaster position="bottom-right" richColors closeButton />
          </NiceModal.Provider>
        </AuthLoader>
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>,
)
