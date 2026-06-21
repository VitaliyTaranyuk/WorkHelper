import { createTheme } from '@mui/material/styles'
import { COLOR, TEXT_STYLES } from './constants'

export const createWorkTechTheme = () =>
  ({
    palette: {
      mode: 'light',
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
        default: COLOR.background[50],
        paper: COLOR.background[100],
      },
      text: {
        primary: COLOR.text.primary,
        secondary: COLOR.text.secondary,
        disabled: COLOR.text.gray,
      },
      divider: COLOR.background[200],
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
            '& .MuiOutlinedInput-root': {
              '& .Mui-disabled': {
                color: COLOR.text.secondary,
                ['WebkitTextFillColor']: COLOR.text.secondary,
                '& fieldset': {
                  borderColor: '#B0B0B0',
                },
              },

              '&.Mui-disabled:hover fieldset': {
                borderColor: '#B0B0B0',
              },
            },
            '& .MuiInputLabel-root.Mui-disabled': {
              color: COLOR.text.secondary,
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
              // TODO: привести все цвета в соответствии с UI KIT
              backgroundColor: '#F7F7FA',
            },
            '&.Mui-disabled': {
              '& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root .MuiPickersSectionList-section *':
                {
                  color: COLOR.text.secondary,
                },
              '&:hover': {
                '.MuiPickersOutlinedInput-root': {
                  borderColor: '#B0B0B0',
                },
                '.MuiPickersOutlinedInput-root fieldset': {
                  borderColor: '#B0B0B0',
                  cursor: 'default',
                },
              },
            },
            // '&.MuiPickersOutlinedInput-root': {
            //   '&:hover .MuiPickersOutlinedInput-root.Mui-disabled': {
            //     borderColor: '#B0B0B0',
            //   },

            //   '&.Mui-disabled:hover fieldset': {
            //     borderColor: '#B0B0B0',
            //   },
            // },
          },
        },
      },

      MuiInputBase: {
        styleOverrides: {
          root: {
            '&.Mui-disabled': {
              color: '#313131 !important',
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

export const workTechMUITheme = createTheme(createWorkTechTheme())
