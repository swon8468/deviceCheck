import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Container, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography } from '@mui/material';
import { Update, Refresh } from '@mui/icons-material';
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
        
        {/* PWA 업데이트 알림 - 전체 화면 Dialog */}
        <Dialog
          open={needRefresh}
          disableEscapeKeyDown
          fullScreen
          PaperProps={{
            sx: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            }
          }}
        >
          <DialogContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'white',
              flex: 1,
            }}
          >
            <Update sx={{ fontSize: 80, mb: 3, color: 'white' }} />
            <DialogTitle
              sx={{
                color: 'white',
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                fontWeight: 'bold',
                mb: 2,
                textAlign: 'center',
                padding: 0,
              }}
            >
              새로운 업데이트가 있습니다!
            </DialogTitle>
            <DialogContentText
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: { xs: '1rem', sm: '1.2rem' },
                mb: 4,
                maxWidth: '600px',
                textAlign: 'center',
              }}
            >
              앱의 새 버전이 준비되었습니다. 계속 사용하려면 업데이트가 필요합니다.
            </DialogContentText>
          </DialogContent>
          <DialogActions
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              padding: 3,
              width: '100%',
              maxWidth: '500px',
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={handleUpdate}
              startIcon={<Refresh />}
              sx={{
                backgroundColor: 'white',
                color: '#667eea',
                fontWeight: 'bold',
                fontSize: { xs: '1rem', sm: '1.1rem' },
                padding: { xs: '12px 48px', sm: '14px 64px' },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                },
                minWidth: { xs: '100%', sm: '300px' },
              }}
            >
              업데이트 및 새로고침
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default App;
