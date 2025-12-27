import React, { Suspense, lazy } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Container, Snackbar, Button, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Footer from './components/Footer';
import ScreenSizeWarning from './components/ScreenSizeWarning';
import { useResponsive } from './hooks/useResponsive';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './styles/common.css';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const HomeroomTeacherDashboard = lazy(() => import('./pages/HomeroomTeacherDashboard'));
const SubjectTeacherDashboard = lazy(() => import('./pages/SubjectTeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));


const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100% !important',
          padding: '0 !important',
          margin: '0 !important',
        },
      },
    },
    MuiBox: {
      styleOverrides: {
        root: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        },
      },
    },
  },
});

const AppContent = () => {
  const { currentUser, userRole, loading } = useAuth();
  
  
  if (!currentUser) {
    return <LoginPage />;
  }


  const renderDashboard = () => {
    switch (userRole) {
      case 'super_admin':
        return <AdminDashboard />;
      case 'homeroom_teacher':
        return <HomeroomTeacherDashboard />;
      case 'subject_teacher':
        return <SubjectTeacherDashboard />;
      case 'student':
        return <StudentDashboard />;
      default:
        return (
          <Box className="page-container">
            <Container className="content-wrapper">
              <div>알 수 없는 사용자 역할입니다. (현재 역할: {userRole})</div>
            </Container>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Suspense
        fallback={
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '100vh',
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        {renderDashboard()}
      </Suspense>
      <Footer />
    </Box>
  );
};

const App = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker 등록 완료:', r);
    },
    onRegisterError(error) {
      console.error('Service Worker 등록 오류:', error);
    },
    onNeedRefresh() {
      console.log('새 버전 감지됨');
    },
    onOfflineReady() {
      console.log('오프라인 준비 완료');
    },
  });
  
  React.useEffect(() => {
    const checkForUpdates = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.update().catch(err => {
              console.log('Service Worker 업데이트 체크:', err);
            });
          });
        });
      }
    };
    
    checkForUpdates();
    
    const interval = setInterval(checkForUpdates, 30000);
    
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    document.title = '올바른 전자기기 사용 관리 시스템';
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'shortcut icon';
    link.href = '/logo.svg';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  const handleUpdate = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await registration.update();
        }
      }
      updateServiceWorker(true);
      window.location.reload();
    } catch (error) {
      console.error('Service Worker 업데이트 오류:', error);
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          width: '100vw',
          maxWidth: '100vw',
          overflowX: 'hidden',
          backgroundColor: '#F5F7FA'
        }}
      >
        <AuthProvider>
          <AppContent />
        </AuthProvider>

        <Dialog
          open={needRefresh}
          onClose={handleDismiss}
          hideBackdrop={false}
          PaperProps={{
            sx: {
              borderRadius: '12px',
              p: 0,
              maxWidth: '360px',
              width: '90%',
              textAlign: 'center',
              boxShadow: 3,
            }
          }}
          sx={{
            zIndex: 13000,
            '& .MuiBackdrop-root': {
              backgroundColor: 'rgba(60, 60, 60, 0.7)',
              backdropFilter: 'none',
            }
          }}
        >
          <Box
            sx={{
              width: '100%',
              padding: { xs: '28px 18px 16px 18px', sm: '32px 24px 20px 24px' },
              bgcolor: '#FFFFFF',
              borderRadius: '12px',
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.22rem', sm: '1.24rem' },
                color: '#181818',
                mb: '12px',
                lineHeight: 1.4
              }}
              component="h2"
            >
              최신 버전 사용 가능
            </Typography>
            <Typography
              sx={{
                color: '#363636',
                fontSize: { xs: '0.98rem', sm: '1rem' },
                mb: '20px',
                lineHeight: 1.5,
                wordBreak: 'keep-all',
              }}
            >
              개발자가 새로운 버전을 배포했습니다.<br />
              안전한 사용을 위해 아래의 버튼을 통해 업데이트를 해주세요.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              disableElevation
              onClick={handleUpdate}
              sx={{
                background: '#FF9800',
                color: '#fff',
                fontWeight: 700,
                fontSize: { xs: '1.05rem', sm: '1.08rem' },
                borderRadius: '8px',
                minHeight: '46px',
                py: 0,
                mb: 0,
                mt: 0,
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#F57C00'
                }
              }}
            >
              업데이트
            </Button>
          </Box>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default App;
