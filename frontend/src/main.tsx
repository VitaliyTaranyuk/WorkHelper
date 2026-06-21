import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import NiceModal from '@ebay/nice-modal-react'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from './features/auth/authStore'
import { AuthLoader } from './features/auth/AuthLoader'
import { addWorkTechApiAuthMiddleware } from './features/auth/apiMiddleware'
import { ThemeProvider } from './application/provider/ThemeProvider'
import {
  addWorkTechApiValidationMiddleware,
  workTechApiClient,
} from './shared/api/workTechHttpClient'
import { QueryProvider } from './application/provider/QueryProvider'

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const router = createRouter({
  routeTree,
  context: {
    isAuthenticated: false,
  },
})

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
          </NiceModal.Provider>
        </AuthLoader>
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>,
)
