import React, { useState } from 'react';
import { Box, ThemeProvider, createTheme, IconButton } from '@mui/material';
import { LightMode as LightModeIcon, DarkMode as DarkModeIcon } from '@mui/icons-material';
import { Toaster, toast } from 'react-hot-toast';
import MinimalImageUpload from './components/MinimalImageUpload';

// Utility function to show error toast
const showErrorToast = (message) => {
  toast.error(message, {
    duration: 4000,
    position: 'bottom-center',
    style: {
      background: '#f44336',
      color: '#ffffff',
      borderRadius: '12px',
      fontWeight: 500,
    },
  });
};

function MinimalApp() {
  const [darkMode, setDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem('ormbg_theme');
    return storedTheme !== null ? storedTheme === 'true' : false;
  });

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196F3',
        light: '#64B5F6',
        dark: '#1976D2',
      },
      secondary: {
        main: '#21CBF3',
        light: '#4DD0E1',
        dark: '#0097A7',
      },
      background: {
        default: darkMode
          ? 'linear-gradient(135deg, #0d1421 0%, #1a2332 50%, #0d1421 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 50%, #f5f7fa 100%)',
        paper: darkMode ? '#1e293b' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h3: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 400,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: theme.palette.background.default,
          py: 4,
        }}
      >
        <MinimalImageUpload showErrorToast={showErrorToast} />
        
        {/* Theme Toggle */}
        <IconButton
          onClick={() => {
            setDarkMode(!darkMode);
            localStorage.setItem('ormbg_theme', (!darkMode).toString());
          }}
          sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            backgroundColor: 'background.paper',
            boxShadow: 2,
          }}
        >
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Box>
      <Toaster 
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontWeight: 500,
          },
        }}
      />
    </ThemeProvider>
  );
}

export default MinimalApp; 