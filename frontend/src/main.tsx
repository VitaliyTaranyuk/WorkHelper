import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from '@tanstack/react-router'
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
import {
  initMonitoring,
  setMonitoringUser,
} from './shared/monitoring/init'

function InnerApp() {
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated)
  return <RouterProvider router={router} context={{ isAuthenticated }} />
}

// ТП-175: мониторинг ошибок инициализируется ДО рендера — краш при старте
// приложения тоже попадает в отчёты. Пользователь привязывается только
// внутренним UUID (не PII) и снимается при логауте.
initMonitoring()
useAuthStore.subscribe((state) => setMonitoringUser(state.user?.id ?? null))

addWorkTechApiAuthMiddleware(workTechApiClient)
// TODO: переделать обработку ошибки в обертке над workTechApiClient
addWorkTechApiValidationMiddleware(workTechApiClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <AuthLoader>
          {/* ТП-131 (TD-015): NiceModal.Provider перенесён внутрь роутера
              (application/router.tsx, опция Wrap) — модалки получают контекст
              роутера. Здесь остаётся только глобальный Toaster. */}
          <InnerApp />
          {/* ТП-71: единая тема тостов в стиле WorkTask (паттерн Linear) —
              нейтральный фон и типографика приложения вместо стандартных
              цветов библиотеки (richColors убран); closeButton — ручное
              закрытие (ТП-59). Все вызовы идут через shared/ui/notify.
              ТП-158: цвета из токенов темы — тост корректен и в тёмной. */}
          <Toaster
            position="bottom-right"
            closeButton
            gap={8}
            duration={4000}
            toastOptions={{
              style: {
                borderRadius: '12px',
                border: '1px solid var(--wt-border)',
                boxShadow: 'var(--wt-shadow-modal)',
                background: 'var(--wt-surface)',
                color: 'var(--wt-text-secondary)',
                fontSize: '13.5px',
                lineHeight: '1.45',
              },
            }}
          />
        </AuthLoader>
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>,
)
