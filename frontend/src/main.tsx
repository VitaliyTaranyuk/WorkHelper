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
            {/* ТП-71: единая тема тостов в стиле WorkTask (паттерн Linear) —
                нейтральный фон и типографика приложения вместо стандартных
                цветов библиотеки (richColors убран); closeButton — ручное
                закрытие (ТП-59). Все вызовы идут через shared/ui/notify. */}
            <Toaster
              position="bottom-right"
              closeButton
              gap={8}
              duration={4000}
              toastOptions={{
                style: {
                  borderRadius: '12px',
                  border: '1px solid #E0E4EA',
                  boxShadow: '0 8px 24px rgba(17, 24, 39, 0.14)',
                  background: '#FFFFFF',
                  color: '#313131',
                  fontSize: '13.5px',
                  lineHeight: '1.45',
                },
              }}
            />
          </NiceModal.Provider>
        </AuthLoader>
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>,
)
