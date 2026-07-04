import React from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getWorkTechTheme } from '@/shared/ui/theme/theme'
import { useThemeMode } from '@/features/settings/themeMode'

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // ТП-64: эффективная тема (light/dark, с учётом system) — синхронно для MUI
  // и для CSS-токенов (data-theme на <html> ставит useThemeMode).
  const { effective } = useThemeMode()
  return (
    <MuiThemeProvider theme={getWorkTechTheme(effective)}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
