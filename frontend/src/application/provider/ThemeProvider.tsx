import React from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { workTechMUITheme } from '@/shared/ui/theme/theme'

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <MuiThemeProvider theme={workTechMUITheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
