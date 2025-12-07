import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Container, Snackbar, Button, Alert } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import HomeroomTeacherDashboard from './pages/HomeroomTeacherDashboard';
import SubjectTeacherDashboard from './pages/SubjectTeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Footer from './components/Footer';
import ScreenSizeWarning from './components/ScreenSizeWarning';
import { useResponsive } from './hooks/useResponsive';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './styles/common.css';

// Material-UI 테마 생성
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#F5F7FA', // 파스텔 톤 배경색
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

// 메인 앱 컴포넌트
const AppContent = () => {
  const { currentUser, userRole, loading } = useAuth();
  
  
  // 로딩 상태를 무시하고 바로 로그인 페이지 표시
  if (!currentUser) {
    return <LoginPage />;
  }

  // 사용자 역할에 따른 대시보드 렌더링
  switch (userRole) {
    case 'super_admin':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AdminDashboard />
          <Footer />
        </Box>
      );
    case 'homeroom_teacher':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <HomeroomTeacherDashboard />
          <Footer />
        </Box>
      );
    case 'subject_teacher':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <SubjectTeacherDashboard />
          <Footer />
        </Box>
      );
    case 'student':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <StudentDashboard />
          <Footer />
        </Box>
      );
    default:
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Box className="page-container">
            <Container className="content-wrapper">
              <div>알 수 없는 사용자 역할입니다. (현재 역할: {userRole})</div>
            </Container>
          </Box>
          <Footer />
        </Box>
      );
  }
};

const App = () => {
  // PWA 업데이트 감지
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Service Worker 등록 완료
    },
    onRegisterError(error) {
      // Service Worker 등록 오류
    },
  });

  React.useEffect(() => {
    document.title = '올바른 전자기기 사용 관리 시스템';
    // 파비콘 설정
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'shortcut icon';
    link.href = '/logo.svg';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  const handleUpdate = () => {
    updateServiceWorker(true);
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
          backgroundColor: '#F5F7FA' // 파스텔 톤 배경색
        }}
      >
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        
        {/* PWA 업데이트 알림 */}
        <Snackbar
          open={needRefresh}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            bottom: { xs: '90px', sm: '24px' },
            zIndex: 9999,
          }}
        >
          <Alert
            severity="info"
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleUpdate}
                  sx={{ fontWeight: 'bold' }}
                >
                  새로고침
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleDismiss}
                >
                  나중에
                </Button>
              </Box>
            }
            sx={{
              width: '100%',
              '& .MuiAlert-message': {
                flex: 1,
              },
            }}
          >
            새로운 업데이트가 있습니다!
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default App;
