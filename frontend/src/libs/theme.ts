import { common, grey } from '@mui/material/colors';
import { alpha, Components, createTheme, Theme } from '@mui/material/styles';

// Define theme constants for reusability
const BORDER_RADIUS = 4;
const SPACING_UNIT = 8;

// Define color tokens - helps with consistency and easier updates
const colors = {
  light: {
    primary: grey[900],
    secondary: grey[500],
    background: common.white,
    paper: grey[50],
    border: grey[200],
    textPrimary: grey[900],
    textSecondary: grey[700],
    divider: grey[200],
    hover: alpha(grey[900], 0.04),
    focus: alpha(grey[900], 0.12),
    shadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
  },
  dark: {
    primary: grey[200],
    secondary: grey[600],
    background: grey[900],
    paper: common.black,
    border: grey[800],
    textPrimary: grey[100],
    textSecondary: grey[300],
    divider: grey[800],
    hover: alpha(grey[200], 0.04),
    focus: alpha(grey[200], 0.12),
    shadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
  },
};

// Define components styling for reusability across light/dark modes
const getComponentsOverrides = (mode: 'light' | 'dark'): Components<Theme> => {
  const tokens = colors[mode];

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': {
          boxSizing: 'border-box',
        },
        body: {
          margin: 0,
          transition: 'background-color 0.2s, color 0.2s',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS,
          textTransform: 'none',
          padding: `${SPACING_UNIT}px ${SPACING_UNIT * 2}px`,
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: tokens.shadow,
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: tokens.shadow,
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: tokens.hover,
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: tokens.border,
          backgroundColor: mode === 'light' ? common.white : common.black,
          color: tokens.textPrimary,
          '& .MuiToolbar-root': {
            minHeight: '64px',
            padding: `0 ${SPACING_UNIT * 2}px`,
          },
        },
      },
      defaultProps: {
        position: 'sticky',
        color: 'inherit',
      },
      variants: [
        {
          props: { color: 'primary' },
          style: {
            backgroundColor: mode === 'light' ? tokens.primary : tokens.paper,
            color: mode === 'light' ? common.white : tokens.primary,
            borderColor: mode === 'light' ? grey[800] : tokens.border,
          },
        },
        {
          props: { color: 'secondary' },
          style: {
            backgroundColor: mode === 'light' ? grey[100] : grey[900],
            color: mode === 'light' ? tokens.textPrimary : tokens.textPrimary,
            borderColor: tokens.border,
          },
        },
      ],
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS,
          border: `1px solid ${tokens.border}`,
          boxShadow: 'none',
          overflow: 'hidden',
          backgroundColor: mode === 'light' ? common.white : colors.dark.paper,
          transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            boxShadow: tokens.shadow,
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: SPACING_UNIT * 2,
        },
        title: {
          fontSize: '1.125rem',
          fontWeight: 600,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: SPACING_UNIT * 2,
          '&:last-child': {
            paddingBottom: SPACING_UNIT * 2,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: BORDER_RADIUS,
            '& fieldset': {
              borderColor: tokens.border,
              transition: 'border-color 0.2s',
            },
            '&:hover fieldset': {
              borderColor: mode === 'light' ? grey[400] : grey[600],
            },
            '&.Mui-focused fieldset': {
              borderColor: tokens.primary,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: tokens.divider,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS,
          '&.Mui-selected': {
            backgroundColor: tokens.hover,
            '&:hover': {
              backgroundColor: tokens.focus,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS,
          height: 32,
        },
        outlined: {
          borderColor: tokens.border,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 48,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? common.white : colors.dark.paper,
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'light' ? common.white : colors.dark.paper,
          borderLeft: `1px solid ${tokens.border}`,
          boxShadow:
            mode === 'light' ? '-4px 0 10px rgba(0, 0, 0, 0.05)' : '-4px 0 10px rgba(0, 0, 0, 0.2)',
        },
      },
    },
  };
};

// Create the base theme with light mode as default
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.light.primary,
      light: grey[800],
      dark: common.black,
      contrastText: common.white,
    },
    secondary: {
      main: colors.light.secondary,
      light: grey[300],
      dark: grey[700],
      contrastText: common.white,
    },
    background: {
      default: colors.light.background,
      paper: colors.light.paper,
    },
    text: {
      primary: colors.light.textPrimary,
      secondary: colors.light.textSecondary,
    },
    divider: colors.light.divider,
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: BORDER_RADIUS,
  },
  spacing: SPACING_UNIT,
  components: getComponentsOverrides('light'),
  // Configuration for dark mode
  colorSchemes: {
    dark: {
      palette: {
        primary: {
          main: colors.dark.primary,
          light: grey[100],
          dark: grey[300],
          contrastText: common.black,
        },
        secondary: {
          main: colors.dark.secondary,
          light: grey[500],
          dark: grey[700],
          contrastText: common.white,
        },
        background: {
          default: colors.dark.background,
          paper: colors.dark.paper,
        },
        text: {
          primary: colors.dark.textPrimary,
          secondary: colors.dark.textSecondary,
        },
        divider: colors.dark.divider,
      },
      components: getComponentsOverrides('dark'),
    },
  },
});

export default theme;
