import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Visibility as VisibilityIcon,
  Logout as LogoutIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, onSnapshot, addDoc } from 'firebase/firestore';

const StudentDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [meritRecords, setMeritRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalMerit: 0,
    totalDemerit: 0,
    netScore: 0
  });
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 상벌점 사유 옵션
  const meritReasons = [
    '수행평가 등으로 인한 상점',
    '모범 학생 상점',
    '봉사 활동 상점',
    '학급 활동 기여 상점',
    '체육 활동 우수 상점',
    '예술 활동 우수 상점',
    '과학 실험 우수 상점',
    '독서 활동 우수 상점',
    '친구 도움 상점',
    '교사 도움 상점',
    '학교 행사 참여 상점',
    '동아리 활동 우수 상점',
    '기타 상점'
  ];

  const demeritReasons = [
    '휴대폰/태블릿 사용',
    '이어폰 사용',
    '지각',
    '무단 조퇴',
    '복장 불량',
    '수업 태도 불량',
    '수업 중 잡담',
    '수업 중 자리 이탈',
    '수업 준비물 미지참',
    '과제 미제출',
    '시험 부정행위',
    '폭력 행위',
    '욕설/비방',
    '교실 청결 불량',
    '급식 예절 불량',
    '기타 벌점'
  ];
  
  // 반응형 디자인
  const { isMobile, isTablet, isDesktop, isSmallMobile, isLargeDesktop, isMobileOrSmaller, isTabletOrLarger } = useResponsive();

  useEffect(() => {
    if (currentUser) {
      let unsubscribe = null;
      
      const setupListener = async () => {
        unsubscribe = await fetchMeritRecords();
      };
      
      setupListener();
      
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [currentUser]);

  const fetchMeritRecords = async () => {
    try {
      setLoading(true);
      
      console.log('=== 학생 상벌점 기록 조회 시작 ===');
      console.log('학생 ID:', currentUser.id);
      console.log('현재 사용자:', currentUser);
      
      const logsRef = collection(db, 'merit_demerit_records');
      const q = query(
        logsRef,
        where('studentId', '==', currentUser.id)
      );
      
      console.log('Firestore 쿼리 실행 중...');
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const records = [];
        let totalMerit = 0;
        let totalDemerit = 0;

        console.log('=== Firestore 조회 결과 ===');
        console.log('조회된 문서 수:', querySnapshot.size);
        console.log('쿼리 스냅샷:', querySnapshot);
        
        if (querySnapshot.empty) {
          console.log('⚠️ 상벌점 기록이 없습니다!');
          console.log('학생 ID로 조회한 결과가 비어있습니다.');
          console.log('studentId 필드가 올바르게 설정되어 있는지 확인하세요.');
        }
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('문서 ID:', doc.id);
          console.log('문서 데이터:', data);
          console.log('studentId 필드:', data.studentId);
          console.log('type 필드:', data.type);
          console.log('points 필드:', data.points);
          console.log('value 필드:', data.value);
          
          // points 필드를 우선으로 하고, 없으면 value 필드 사용
          const points = data.points || data.value || 0;
          console.log('계산된 points:', points);
          
          records.push({
            id: doc.id,
            ...data,
            points: points, // points 필드 명시적으로 설정
            value: points,  // 기존 value 필드도 호환성을 위해 설정
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
          });

          if (data.type === 'merit') {
            totalMerit += points;
            console.log('상점 추가:', points, '총 상점:', totalMerit);
          } else if (data.type === 'demerit') {
            totalDemerit += Math.abs(points); // 벌점은 절댓값으로 계산
            console.log('벌점 추가:', Math.abs(points), '총 벌점:', totalDemerit);
          }
        });

        records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log('=== 최종 결과 ===');
        console.log('처리된 기록 수:', records.length);
        console.log('총 상점:', totalMerit);
        console.log('총 벌점:', totalDemerit);
        console.log('순점수:', totalMerit - totalDemerit);
        console.log('기록 목록:', records);

        setMeritRecords(records);
        setSummary({
          totalMerit,
          totalDemerit,
          netScore: totalMerit - totalDemerit
        });
        setLoading(false);
      }, (error) => {
        console.error('Firestore 조회 오류:', error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('fetchMeritRecords 오류:', error);
      setLoading(false);
      return null;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // 로그아웃 오류 처리
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type) => {
    return type === 'merit' ? 'success' : 'error';
  };

  const getTypeIcon = (type) => {
    return type === 'merit' ? <AddIcon /> : <RemoveIcon />;
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      width: '100%'
    }}>
      <Container maxWidth="md" sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        width: '100%',
        py: 4
      }}>
        {/* 헤더 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4, 
          width: '100%',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
            <Typography 
              variant={isMobile ? 'h5' : isTablet ? 'h4' : 'h3'} 
              component="h1" 
              gutterBottom
              sx={{ fontWeight: 'bold' }}
            >
              학생 대시보드
            </Typography>
            <Typography 
              variant={isMobile ? 'body1' : 'h6'} 
              color="text.secondary"
              sx={{ mb: 1, textAlign: 'center' }}
            >
              {currentUser.name} ({currentUser.grade}학년 {currentUser.class}반 {currentUser.number}번)
            </Typography>
          </Box>
        </Box>

        {/* 현재 누적 점수 */}
        <Card sx={{ mb: 4, width: '100%', maxWidth: '400px' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              현재 누적 점수
            </Typography>
            <Typography 
              variant="h3" 
              color={summary.netScore >= 0 ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 'bold' }}
            >
              {summary.netScore}점
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              상점: {summary.totalMerit}점 | 벌점: {summary.totalDemerit}점
            </Typography>
          </CardContent>
        </Card>

        {/* 버튼들 */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3, 
          width: '100%',
          justifyContent: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center'
        }}>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            size={isMobile ? "medium" : "large"}
            fullWidth={isMobile}
            sx={{ maxWidth: isMobile ? '100%' : '200px' }}
          >
            메인화면
          </Button>
          <Button
            variant="contained"
            startIcon={<VisibilityIcon />}
            onClick={() => setShowDetails(true)}
            size={isMobile ? "medium" : "large"}
            fullWidth={isMobile}
            sx={{ maxWidth: isMobile ? '100%' : '200px' }}
          >
            자세히 보기
          </Button>
        </Box>

        {/* 상세 내역 다이얼로그 */}
        <Dialog
          open={showDetails}
          onClose={() => setShowDetails(false)}
          maxWidth={isMobile ? 'xs' : 'md'}
          fullWidth
        >
          <DialogTitle>
            상벌점 상세 내역
          </DialogTitle>
          <DialogContent>
            <div className="table-scroll-container">
              <TableContainer component={Paper}>
                <Table size={isMobile ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell>날짜</TableCell>
                      <TableCell>구분</TableCell>
                      <TableCell>점수</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>사유</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {meritRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          상벌점 기록이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      meritRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {formatDate(record.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getTypeIcon(record.type)}
                              label={record.type === 'merit' ? '상점' : '벌점'}
                              color={getTypeColor(record.type)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${record.points > 0 ? '+' : ''}${record.points}점`}
                              color={record.points > 0 ? 'success' : 'error'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title={record.reason} placement="top">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {record.type === 'merit' 
                                    ? (meritReasons.includes(record.reason) ? record.reason : '기타 상점')
                                    : (demeritReasons.includes(record.reason) ? record.reason : '기타 벌점')
                                  }
                                </Typography>
                                {record.reason && !meritReasons.includes(record.reason) && !demeritReasons.includes(record.reason) && (
                                  <InfoIcon fontSize="small" color="action" />
                                )}
                              </Box>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDetails(false)}>
              닫기
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default StudentDashboard;