import { createTheme } from '@mui/material/styles'
import { COLOR, TEXT_STYLES } from './constants'

// ТП-64: тёмная палитра поверх токенов темы (см. style/theme.css). Значения
// совпадают с CSS-переменными, чтобы MUI-компоненты и кастомный шелл были
// согласованы.
const DARK = {
  bg: '#14161c',
  surface: '#1e2029',
  surfaceMuted: '#262933',
  border: '#333743',
  text: '#f2f3f5',
  textSecondary: '#c9ccd3',
  textDisabled: '#7c828d',
} as const

type Mode = 'light' | 'dark'

export const createWorkTechTheme = (mode: Mode = 'light') =>
  ({
    palette: {
      mode,
      primary: {
        50: COLOR.main[50],
        100: COLOR.main[100],
        200: COLOR.main[200],
        300: COLOR.main[300],
        400: COLOR.main[400],
        500: COLOR.main[500],
        600: COLOR.main[600],
        700: COLOR.main[700],
        800: COLOR.main[800],
        900: COLOR.main[900],
        main: COLOR.main[500],
        light: COLOR.main[300],
        dark: COLOR.main[700],
        contrastText: COLOR.text.light,
      },
      secondary: {
        main: COLOR.main[600],
        light: COLOR.main[400],
        dark: COLOR.main[800],
        contrastText: COLOR.text.light,
      },
      error: {
        main: COLOR.text.negative,
        // TODO: уточнить цвета по дизайну, если будем с этим сталкиваться
        light: '#ffcdd2',
        dark: '#d32f2f',
        contrastText: COLOR.text.light,
      },
      warning: {
        main: '#ff9800',
        light: '#ffb74d',
        dark: '#f57c00',
        contrastText: COLOR.text.light,
      },
      info: {
        main: COLOR.main[500],
        light: COLOR.main[300],
        dark: COLOR.main[700],
        contrastText: COLOR.text.light,
      },
      success: {
        main: COLOR.text.positive,
        light: '#c8e6c9',
        dark: '#388e3c',
        contrastText: COLOR.text.light,
      },
      background: {
        default: mode === 'dark' ? DARK.bg : COLOR.background[50],
        paper: mode === 'dark' ? DARK.surface : COLOR.background[100],
      },
      text: {
        primary: mode === 'dark' ? DARK.text : COLOR.text.primary,
        secondary: mode === 'dark' ? DARK.textSecondary : COLOR.text.secondary,
        disabled: mode === 'dark' ? DARK.textDisabled : COLOR.text.gray,
      },
      divider: mode === 'dark' ? DARK.border : COLOR.background[200],
    },
    typography: {
      fontFamily: 'Inter, InterVariable, sans-serif',
      h1: TEXT_STYLES.headline.h1,
      h2: TEXT_STYLES.headline.h2,
      h3: TEXT_STYLES.headline.h3,
      h4: TEXT_STYLES.headline.h4,
      h5: TEXT_STYLES.headline.h5,
      body1: TEXT_STYLES.body,
      caption: TEXT_STYLES.caption,
      button: TEXT_STYLES.button,
    },

    // TODO: дописать стили для MuiModal MuiDialog MuiDrawer MuiTextField при необходимости
    // TODO: проверить стили сгенерированные ниже, если раскоментировать на странице логина и регистрации будут не сочетаться цвета, так как там не ui kit схема

    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            // ТП-158: disabled-состояния из токенов темы — раньше светлотемные
            // хардкоды делали отключённые поля нечитаемыми в тёмной.
            '& .MuiOutlinedInput-root': {
              '& .Mui-disabled': {
                color: 'var(--wt-text-secondary)',
                ['WebkitTextFillColor']: 'var(--wt-text-secondary)',
                '& fieldset': {
                  borderColor: 'var(--wt-border)',
                },
              },

              '&.Mui-disabled:hover fieldset': {
                borderColor: 'var(--wt-border)',
              },
            },
            '& .MuiInputLabel-root.Mui-disabled': {
              color: 'var(--wt-text-secondary)',
            },
          },
        },
      },
      // MuiFormControl: {
      //   styleOverrides: {
      //     root: {
      //       background: 'red',
      //     },
      //   },
      // },

      MuiPickersTextField: {
        styleOverrides: {
          root: {
            '& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root': {
              // ТП-158: фон поля из токена темы (корректно в тёмной)
              backgroundColor: 'var(--wt-field)',
            },
            '&.Mui-disabled': {
              '& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root .MuiPickersSectionList-section *':
                {
                  color: COLOR.text.secondary,
                },
              '&:hover': {
                '.MuiPickersOutlinedInput-root': {
                  borderColor: 'var(--wt-border)',
                },
                '.MuiPickersOutlinedInput-root fieldset': {
                  borderColor: 'var(--wt-border)',
                  cursor: 'default',
                },
              },
            },
            // '&.MuiPickersOutlinedInput-root': {
            //   '&:hover .MuiPickersOutlinedInput-root.Mui-disabled': {
            //     borderColor: 'var(--wt-border)',
            //   },

            //   '&.Mui-disabled:hover fieldset': {
            //     borderColor: 'var(--wt-border)',
            //   },
            // },
          },
        },
      },

      MuiInputBase: {
        styleOverrides: {
          root: {
            '&.Mui-disabled': {
              // ТП-158: токен вместо светлотемного хардкода (#313131 в тёмной
              // теме делал disabled-поля нечитаемыми)
              color: 'var(--wt-text-secondary) !important',
            },
          },
        },
      },
    },

    // components: {
    // MuiButton: {
    //   styleOverrides: {
    //     root: {
    //       borderRadius: '12px',
    //       textTransform: 'none',
    //       fontWeight: 400,
    //       fontSize: '16px',
    //       lineHeight: '100%',
    //       letterSpacing: '0%',
    //       boxShadow: 'none',
    //       '&:hover': {
    //         boxShadow: 'none',
    //       },
    //     },
    //     contained: {
    //       backgroundColor: COLOR.main[500],
    //       color: COLOR.text.light,
    //       border: `1px solid ${COLOR.main[350]}`,
    //       '&:hover': {
    //         backgroundColor: COLOR.main[600],
    //         borderColor: COLOR.main[400],
    //       },
    //       '&:disabled': {
    //         backgroundColor: COLOR.main[200],
    //         color: COLOR.main[350],
    //         borderColor: COLOR.main[200],
    //       },
    //     },
    //     outlined: {
    //       borderColor: COLOR.main[350],
    //       color: COLOR.main[500],
    //       '&:hover': {
    //         borderColor: COLOR.main[400],
    //         backgroundColor: COLOR.main[50],
    //       },
    //       '&:disabled': {
    //         borderColor: COLOR.main[200],
    //         color: COLOR.main[350],
    //       },
    //     },
    //     text: {
    //       color: COLOR.main[500],
    //       '&:hover': {
    //         backgroundColor: COLOR.main[50],
    //       },
    //       '&:disabled': {
    //         color: COLOR.main[350],
    //       },
    //     },
    //     sizeSmall: TEXT_STYLES.button.small,
    //   },
    // },

    // MuiTextField: {
    //   styleOverrides: {
    //     root: {
    //       '& .MuiOutlinedInput-root': {
    //         borderRadius: '12px',
    //         '& fieldset': {
    //           borderColor: COLOR.background[200],
    //         },
    //         '&:hover fieldset': {
    //           borderColor: COLOR.main[300],
    //         },
    //         '&.Mui-focused fieldset': {
    //           borderColor: COLOR.main[500],
    //         },
    //         '&.Mui-error fieldset': {
    //           borderColor: COLOR.text.negative,
    //         },
    //       },
    //     },
    // },
    // },
  }) as const

export const workTechMUITheme = createTheme(createWorkTechTheme('light'))

// ТП-64: кэш тем по режиму — не пересоздаём тему на каждый рендер.
const THEME_BY_MODE = {
  light: workTechMUITheme,
  dark: createTheme(createWorkTechTheme('dark')),
} as const

export function getWorkTechTheme(mode: Mode) {
  return THEME_BY_MODE[mode]
}
