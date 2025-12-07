import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useResponsive } from '../hooks/useResponsive';

const ScreenSizeWarning = () => {
  const { isMobile, isTablet } = useResponsive();

  if (!isMobile && !isTablet) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          maxWidth: 400,
          backgroundColor: 'white'
        }}
      >
        <Typography variant="h5" gutterBottom color="error" sx={{ fontWeight: 'bold' }}>
          ⚠️ 화면 크기 경고
        </Typography>
        <Typography variant="body1" paragraph>
          현재 화면이 너무 작습니다.
        </Typography>
        <Typography variant="body1" paragraph>
          이 시스템을 사용하려면 화면을 키우거나 데스크톱/태블릿에서 접속해주세요.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          권장 최소 화면 크기: 1024px × 768px
        </Typography>
      </Paper>
    </Box>
  );
};

export default ScreenSizeWarning;
