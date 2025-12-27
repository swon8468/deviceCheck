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

// 코드 스플리팅: 필요할 때만 로드
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const HomeroomTeacherDashboard = lazy(() => import('./pages/HomeroomTeacherDashboard'));
const SubjectTeacherDashboard = lazy(() => import('./pages/SubjectTeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));

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

  // 사용자 역할에 따른 대시보드 렌더링 (코드 스플리팅 적용)
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
        
        {/* PWA 업데이트 알림 - 모달 형태 */}
        <Dialog
          open={needRefresh}
          onClose={handleDismiss}
          PaperProps={{
            sx: {
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center'
            }
          }}
          sx={{
            zIndex: 9999,
            '& .MuiBackdrop-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }
          }}
        >
          <DialogTitle
            sx={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#000',
              paddingBottom: '16px',
              textAlign: 'center'
            }}
          >
            최신 버전 업데이트
          </DialogTitle>
          <DialogContent sx={{ paddingBottom: '20px' }}>
            <Typography
              variant="body1"
              sx={{
                color: '#000',
                fontSize: '14px',
                lineHeight: '1.6',
                textAlign: 'center'
              }}
            >
              최신버전 앱으로 업데이트를 위해<br />
              스토어로 이동합니다.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', paddingTop: '8px' }}>
            <Button
              variant="contained"
              onClick={handleUpdate}
              sx={{
                backgroundColor: '#FF9800',
                color: '#FFFFFF',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '10px 40px',
                textTransform: 'none',
                fontSize: '16px',
                '&:hover': {
                  backgroundColor: '#F57C00'
                }
              }}
            >
              확인
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default App;
