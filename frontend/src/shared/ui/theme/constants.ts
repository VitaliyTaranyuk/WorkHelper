export const COLOR = {
  main: {
    50: '#EFF0FE',
    75: '#E9E9FD',
    100: '#E2E3FD ',
    150: '#D6D7FC',
    200: '#CBCBFA',
    250: '#BCBBF8 ',
    300: '#ACABF6',
    350: '#9F9AF3',
    400: '#9389F0',
    500: '#7761E6',
    600: '#7250DB',
    700: '#6341C1',
    800: '#51379C',
    900: '#44337C',
    950: '#291E48',
  },
  background: {
    50: '#FAFAFA',
    100: '#F6F6F6',
    150: '#F3F4F7',
    200: '#EBECF0',
    500: '#E0E4EA',
  },
  text: {
    active: '#684FE3',
    primary: '#0F0F0F',
    secondary: '#313131',
    tertiary: '#7B7B7B',
    gray: '#8C8C8C',
    light: '#F5F5F5',
    positive: '#00C012',
    negative: '#B20900',
    // TODO: уточнить у Алены не нужно ли просто gray использовать и его нет в UI-KIT
    lightGray400: `rgba(136, 136, 136, 1)`,
  },
  priority: {
    positive: {
      primary: '#0F0F0F',
      secondary: '#684FE3',
    },
    danger: {
      primary: '#313131',
      secondary: '#7B7B7B',
    },
    negative: {
      primary: '#8C8C8C',
      secondary: '#7B7B7B',
    },
  },
}

export const TEXT_STYLES = {
  headline: {
    h1: {
      fontWeight: 500,
      fontSize: '35px',
      lineHeight: '100%',
      letterSpacing: '0%',
    },
    h2: {
      fontWeight: 500,
      fontSize: '24px',
      lineHeight: '100%',
      letterSpacing: '0%',
    },
    h3: {
      fontWeight: 500,
      fontSize: '20px',
      lineHeight: '100%',
      letterSpacing: '0%',
    },
    h4: {
      fontWeight: 500,
      fontSize: '18px',
      lineHeight: '100%',
      letterSpacing: '0%',
    },
    h5: {
      fontWeight: 500,
      fontSize: '16px',
      lineHeight: '100%',
      letterSpacing: '0%',
    },
  },
  body: {
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '18px',
    letterSpacing: '0%',
  },
  caption: {
    fontWeight: 400,
    fontSize: '12px',
    lineHeight: '100%',
    letterSpacing: '1%',
  },
  storyPoint: {
    fontWeight: 500,
    fontSize: '12px',
    lineHeight: '10px',
    letterSpacing: '-3%',
  },
  button: {
    normal: {
      fontWeight: 400,
      fontSize: '16px',
      lineHeight: '100%',
      letterSpacing: '0%',
    },
    small: {
      fontWeight: 400,
      fontSize: '12px',
      lineHeight: '100%',
      letterSpacing: '0%',
    },
  },
}
