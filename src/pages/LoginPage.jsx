import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  Container,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  InputAdornment
} from '@mui/material';
import { School, Person, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import Swal from 'sweetalert2';
import logoImage from '../img/logo.png';

const LoginPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [studentForm, setStudentForm] = useState({
    name: '',
    birthDate: '',
    studentId: ''
  });
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { loginStudent, loginTeacher } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!studentForm.name || !studentForm.birthDate || !studentForm.studentId) {
      setError('모든 필드를 입력해주세요.');
      setLoading(false);
      return;
    }

    if (studentForm.studentId.length !== 5) {
      setError('학번은 5자리로 입력해주세요.');
      setLoading(false);
      return;
    }

    // 생년월일을 YYYY-MM-DD 형식으로 변환
    let formattedBirthDate = studentForm.birthDate;
    if (studentForm.birthDate.length === 6) {
      // 6자리 형식 (YYMMDD)을 YYYY-MM-DD로 변환
      const year = '20' + studentForm.birthDate.substring(0, 2);
      const month = studentForm.birthDate.substring(2, 4);
      const day = studentForm.birthDate.substring(4, 6);
      formattedBirthDate = `${year}-${month}-${day}`;
    } else if (studentForm.birthDate.length === 8) {
      // 8자리 형식 (YYYYMMDD)을 YYYY-MM-DD로 변환
      const year = studentForm.birthDate.substring(0, 4);
      const month = studentForm.birthDate.substring(4, 6);
      const day = studentForm.birthDate.substring(6, 8);
      formattedBirthDate = `${year}-${month}-${day}`;
    } else if (studentForm.birthDate.length !== 10 || !studentForm.birthDate.includes('-')) {
      setError('생년월일은 YYYY-MM-DD 형식으로 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const result = await loginStudent(
        studentForm.name,
        formattedBirthDate,
        studentForm.studentId
      );
      
      if (!result.success) {
        await Swal.fire({
          title: '로그인 실패',
          text: result.error,
          icon: 'error',
          confirmButtonText: '확인'
        });
        setError(result.error);
      } else {
        setSuccess('학생 로그인 성공!');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
    }
    
    setLoading(false);
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!teacherForm.email || !teacherForm.password) {
      setError('모든 필드를 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const result = await loginTeacher(teacherForm.email, teacherForm.password);
      
      if (!result.success) {
        await Swal.fire({
          title: '로그인 실패',
          text: result.error,
          icon: 'error',
          confirmButtonText: '확인'
        });
        setError(result.error);
      } else {
        setSuccess('교사 로그인 성공!');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
    }
    
    setLoading(false);
  };



  return (
    <Box 
      className="page-container"
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Container maxWidth="sm" className="content-wrapper">
        <Box sx={{ textAlign: 'center', mb: 4, width: '100%' }}>
          {/* 로고 */}
          <Box sx={{ mb: 3 }}>
            <img 
              src={logoImage} 
              alt="로고" 
              style={{ 
                width: '80px', 
                height: '80px',
                filter: 'brightness(0) invert(1)'
              }}
            />
          </Box>
          
          <Typography 
            variant={isMobile ? 'h4' : isTablet ? 'h3' : 'h2'} 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            규칙 위반 관리
          </Typography>
          
          
          <Button
            variant="text"
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'underline',
              mt: 1,
              fontSize: '0.875rem'
            }}
            onClick={() => {
              Swal.fire({
                title: '관련 근거',
                html: `
<div style="text-align: left; line-height: 1.6;">
                    <h3>2025학년도 2학년 전자기기 사용 운영(안) 안내</h3>
                    <p>최근 전자기기 사용과 관련하여 학생회 및 각 학급 반장과의 논의를 거쳐, 2025년 8월 18일 회의에서 아래와 같이 새로운 운영 방안을 마련하였습니다.</p>
                    <p>학교 생활규정에 근거하여, 전자기기의 올바른 사용을 위해 다음 사항을 반드시 지켜주시기 바랍니다.</p>
                    
                    <h4>1. 전자기기 사용 규칙</h4>
                    <p>• <strong>등교 시 즉시 제출</strong>(08:10 ~ 19:00 사용 제한)</p>
                    <p>• <strong>수업 중 사용</strong>: 교사가 필요하다고 허용한 경우만 가능</p>
                    <p>• <strong>19:10 이후 자습 시간</strong>: 학습 목적에 한해 사용 가능(오락•영상 시청 제한)</p>
                    <p>• <strong>시험 1주일 전</strong>: 학습 목적사용만 허용</p>
                    
                    <h4>2. 위반 시 조치</h4>
                    <p>• 위반 시 즉시 담임 교사에게 제출 -> '전자기기 사용 누적표' 기록</p>
                    <p><strong>개인 기준</strong></p>
                    <p>   • 3회 적발 -> 담임 교사 상담</p>
                    <p><strong>학급 기준(월단위)</strong></p>
                    <p>   • 5회 이상 적발 -> 야간자율학습 1교시 사용 제한</p>
                    <p>   • 7회 이상 적발 -> 야간자율학습 전체 사용 제한</p>
                    <p>   • 9회 이상 적발 -> 시험 전 1주일 사용 제한</p>

                    <h4>3. 우수 학급 포상</h4>
                    <p>• 분기별 전자기기 사용 규칙을 가장 잘 지킨 학급을 선정하여 소정의 상품 증정</p>

                    <h4>4. 관련 근거(생활규정 발췌)</h4>
                    <p><strong>제 10조(학급 및 수업에서 태도)</strong></p>
                    <p>  11. 수업 중 교사가 허용한 경우에만 태블릿 PC를 사용한다.</p>
                    <p>  12. 수업 중 이어폰(에어팟) 착용을 금지한다.</p>
                    <p><strong>제 15조(전자기기 사용)</strong></p>
                    <p>  1. 교육활동 과정(조•종례, 수업, 청소, 자기주도학습, 학교행사, 체험활동)에서 휴대폰 등 전자 기기는 작동 사용하지 않는다. 단, 교육적 목적 달성을 위해 교사가 허가한 경우는 예외로 한다.</p>
                    
                    <h5>학습권 보호와 건강한 학교문화 조성을 위한 규정이니, 다 함께 협력해 주시기 바랍니다.</h5>
                  </div>
                `,
                width: '600px',
                confirmButtonText: '확인'
              });
            }}
          >
            관련 근거
          </Button>
        </Box>

        <Paper 
          elevation={8} 
          sx={{ 
            borderRadius: 3,
            width: '100%',
            maxWidth: isMobile ? '100%' : '500px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<Person />} 
              label={isMobile ? "학생" : "학생 로그인"} 
              iconPosition="start"
            />
            <Tab 
              icon={<School />} 
              label={isMobile ? "교사" : "교사 로그인"} 
              iconPosition="start"
            />
          </Tabs>

          <CardContent sx={{ p: isMobile ? 2 : 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {tabValue === 0 && (
              <Box component="form" onSubmit={handleStudentSubmit}>
                <TextField
                  fullWidth
                  label="이름"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                  margin="normal"
                  required
                  size={isMobile ? "small" : "medium"}
                />
                <TextField
                  fullWidth
                  label="생년월일 (8자리 또는 YYYY-MM-DD)"
                  value={studentForm.birthDate}
                  onChange={(e) => setStudentForm({...studentForm, birthDate: e.target.value})}
                  margin="normal"
                  placeholder="예: 20080101 또는 2008-01-01"
                  inputProps={{ maxLength: 10 }}
                  required
                  size={isMobile ? "small" : "medium"}
                />
                <TextField
                  fullWidth
                  label="학번 (5자리)"
                  value={studentForm.studentId}
                  onChange={(e) => setStudentForm({...studentForm, studentId: e.target.value})}
                  margin="normal"
                  placeholder="예: 10101"
                  inputProps={{ maxLength: 5 }}
                  required
                  size={isMobile ? "small" : "medium"}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size={isMobile ? "medium" : "large"}
                  disabled={loading}
                  sx={{ mt: 3 }}
                >
                  {loading ? '로그인 중...' : '학생 로그인'}
                </Button>
              </Box>
            )}

            {tabValue === 1 && (
              <Box component="form" onSubmit={handleTeacherSubmit}>
                <TextField
                  fullWidth
                  label="이메일"
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({...teacherForm, email: e.target.value})}
                  margin="normal"
                  required
                  size={isMobile ? "small" : "medium"}
                />
                <TextField
                  fullWidth
                  label="비밀번호"
                  type={showPassword ? "text" : "password"}
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({...teacherForm, password: e.target.value})}
                  margin="normal"
                  required
                  size={isMobile ? "small" : "medium"}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size={isMobile ? "medium" : "large"}
                  disabled={loading}
                  sx={{ mt: 3 }}
                >
                  {loading ? '로그인 중...' : '교사 로그인'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Paper>

      </Container>
    </Box>
  );
};

export default LoginPage;
