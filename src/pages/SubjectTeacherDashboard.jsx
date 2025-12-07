import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Logout as LogoutIcon,
  Group as GroupIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import logoImage from '../img/logo.png';

const SubjectTeacherDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // 사이드바 토글 함수
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [studentLogs, setStudentLogs] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [meritReasons, setMeritReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  

  
  // 반응형 디자인
  const theme = useTheme();
  const { isMobile, isTablet, isDesktop, isSmallMobile, isLargeDesktop, isMobileOrSmaller, isTabletOrLarger } = useResponsive();
  
  // 다이얼로그 상태
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showClassStudentsDialog, setShowClassStudentsDialog] = useState(false);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [showInquiryDetailDialog, setShowInquiryDetailDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  
  // 폼 데이터
  const [requestForm, setRequestForm] = useState({
    studentId: '',
    type: 'demerit',
    reason: '',
    value: 1,
    description: ''
  });

  // 학생 정렬 상태
  const [studentSortConfig, setStudentSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });

  // 클래스 정렬 상태
  const [classSortConfig, setClassSortConfig] = useState({
    key: 'className',
    direction: 'asc'
  });

  // 학생 검색 상태
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // 학생 상벌점 내역 상태
  const [showStudentHistoryDialog, setShowStudentHistoryDialog] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);
  const [studentMeritHistory, setStudentMeritHistory] = useState([]);

  // 학생 정렬 함수
  const handleStudentSort = (key) => {
    setStudentSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 클래스 정렬 함수
  const handleClassSort = (key) => {
    setClassSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 학생 검색 함수
  const handleStudentSearch = (searchTerm) => {
    setStudentSearchTerm(searchTerm);
  };

  // 검색어로 학생 필터링
  const getFilteredStudents = () => {
    if (!studentSearchTerm.trim()) {
      return students;
    }
    
    const searchLower = studentSearchTerm.toLowerCase();
    return students.filter(student => 
      student.name.toLowerCase().includes(searchLower) ||
      student.studentId.toLowerCase().includes(searchLower) ||
      `${student.grade}학년 ${student.class}반`.includes(studentSearchTerm) ||
      (student.homeroomTeacherName && student.homeroomTeacherName.toLowerCase().includes(searchLower)) ||
      (student.homeroomTeacher && student.homeroomTeacher.toLowerCase().includes(searchLower))
    );
  };

  // 학생 상벌점 내역 조회
  const fetchStudentMeritHistory = async (studentId) => {
    try {
      const meritLogsRef = collection(db, 'merit_demerit_records');
      const q = query(
        meritLogsRef,
        where('studentId', '==', studentId)
      );
      
      const snapshot = await getDocs(q);
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setStudentMeritHistory(historyData);
    } catch (error) {
      setStudentMeritHistory([]);
    }
  };

  // 학생 내역 보기 핸들러
  const handleViewStudentHistory = async (student) => {
    setSelectedStudentForHistory(student);
    setShowStudentHistoryDialog(true);
    await fetchStudentMeritHistory(student.id);
  };

  const [inquiryForm, setInquiryForm] = useState({
    title: '',
    content: '',
    category: '일반'
  });

  // 상벌점 사유는 Firebase에서 가져옴

  const inquiryCategories = [
    '일반',
    '시스템 오류',
    '기능 요청',
    '계정 관련',
    '데이터 관련',
    '기타'
  ];

  useEffect(() => {
    if (currentUser) {
      let unsubscribeStudents = null;
      let unsubscribeRequests = null;
      let unsubscribeLogs = null;
      let unsubscribeInquiries = null;
      
      const setupListeners = async () => {
        try {
          unsubscribeStudents = await fetchStudents();
          unsubscribeRequests = await fetchSentRequests();
          unsubscribeLogs = await fetchStudentLogs();
          unsubscribeInquiries = await fetchInquiries();
          await fetchTeachers();
          
          // 교과목 교사 대시보드 접근 로그 기록
          try {
            await addDoc(collection(db, 'system_logs'), {
              userId: currentUser.uid,
              userName: currentUser.name || currentUser.email,
              userRole: currentUser.role,
              majorCategory: '교사 활동',
              middleCategory: '대시보드 접근',
              minorCategory: '',
              action: '교과목 교사 대시보드 접근',
              details: `${currentUser.name || currentUser.email}님이 교과목 교사 대시보드에 접근했습니다.`,
              timestamp: new Date(),
              createdAt: new Date()
            });
          } catch (logError) {
            // 로그 기록 오류 무시
          }
        } catch (error) {
          setError(error.message);
        }
      };
      
      setupListeners();
      
      // 상벌점 사유 로드
      fetchMeritReasons();
      
      // cleanup 함수들 반환
      return () => {
        if (typeof unsubscribeStudents === 'function') unsubscribeStudents();
        if (typeof unsubscribeRequests === 'function') unsubscribeRequests();
        if (typeof unsubscribeLogs === 'function') unsubscribeLogs();
        if (typeof unsubscribeInquiries === 'function') unsubscribeInquiries();
      };
    }
  }, [currentUser]);

  // selectedStudent가 변경될 때 requestForm.studentId도 설정
  useEffect(() => {
    if (selectedStudent) {
      setRequestForm(prev => ({
        ...prev,
        studentId: selectedStudent.id
      }));
    }
  }, [selectedStudent]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudents(),
        fetchSentRequests()
      ]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // 교과 선생님이 담당하는 클래스들을 먼저 찾기
      const classesRef = collection(db, 'classes');
      
      // 실시간 업데이트를 위한 onSnapshot 사용
      const unsubscribeClasses = onSnapshot(classesRef, (classesSnapshot) => {
        const assignedClasses = [];
        
        classesSnapshot.forEach((doc) => {
          const classData = doc.data();
          if (classData.subjectTeachers && classData.subjectTeachers.includes(currentUser.uid)) {
            assignedClasses.push({
              id: doc.id,
              ...classData
            });
          }
        });
        
        setClasses(assignedClasses);
        
        // 담당하는 클래스의 학생들만 가져오기
        if (assignedClasses.length > 0) {
          const studentsRef = collection(db, 'accounts');
          
          // 모든 클래스의 학생들을 한 번에 조회
          const gradeClassPairs = assignedClasses.map(c => ({ grade: c.grade, class: c.class }));
          const uniqueGrades = [...new Set(gradeClassPairs.map(p => p.grade))];
          const uniqueClasses = [...new Set(gradeClassPairs.map(p => p.class))];
          
          const q = query(
            studentsRef, 
            where('role', '==', 'student'),
            where('grade', 'in', uniqueGrades),
            where('class', 'in', uniqueClasses)
          );
          
          const unsubscribeStudents = onSnapshot(q, (querySnapshot) => {
            const studentsData = [];
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              // 해당 교사가 담당하는 클래스의 학생만 필터링
              const isInTeacherClass = assignedClasses.some(c => {
                const gradeMatch = c.grade === data.grade;
                const classMatch = c.class === data.class;
                const teacherMatch = c.subjectTeachers && c.subjectTeachers.includes(currentUser.uid);
                
                return gradeMatch && classMatch && teacherMatch;
              });
              
              if (isInTeacherClass) {
                // 해당 학생의 클래스 정보에서 담임교사 정보 가져오기
                const studentClass = assignedClasses.find(c => 
                  c.grade === data.grade && c.class === data.class
                );
                
                studentsData.push({
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                  className: `${data.grade}학년 ${data.class}반`,
                  homeroomTeacherName: studentClass?.homeroomTeacherName || studentClass?.teacherName,
                  homeroom_teacher: studentClass?.homeroomTeacher || studentClass?.homeroomTeacherId || studentClass?.teacherId
                });
              }
            });
            
            setStudents(studentsData);
            setLoading(false);
          }, (error) => {
            setLoading(false);
          });
          
          // 학생 조회 cleanup 함수 반환
          return unsubscribeStudents;
        }
        setLoading(false);
      }, (error) => {
        setLoading(false);
      });
      
      // 클래스 조회 cleanup 함수 반환
      return unsubscribeClasses;
    } catch (error) {
      setLoading(false);
      return null;
    }
  };

  const fetchSentRequests = async () => {
    try {
      // 교과목 교사가 보낸 상벌점 요청들 조회
      const requestsRef = collection(db, 'merit_demerit_requests');
      const q = query(
        requestsRef,
        where('requestingTeacherId', '==', currentUser.uid)
      );
      
      // 실시간 업데이트를 위한 onSnapshot 사용
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          responseAt: doc.data().responseAt?.toDate?.() || (doc.data().responseAt ? new Date(doc.data().responseAt) : null)
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setSentRequests(requestsData);
      }, (error) => {
      });
      
      // cleanup 함수 반환
      return unsubscribe;
    } catch (error) {
      return null;
    }
  };

  const fetchStudentLogs = async () => {
    try {
      // 새로운 로그 컬렉션에서 해당 교사가 처리한 상벌점 로그 조회
      const logsRef = collection(db, 'merit_demerit_records');
      const q = query(
        logsRef,
        where('teacherId', '==', currentUser.uid)
      );
      
      // 실시간 업데이트를 위한 onSnapshot 사용
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setStudentLogs(logsData);
      }, (error) => {
      });
      
      // cleanup 함수 반환
      return unsubscribe;
    } catch (error) {
      return null;
    }
  };

  const fetchInquiries = async () => {
    try {
      
      // 본인이 작성한 문의만 조회
      const inquiriesRef = collection(db, 'inquiries');
      const q = query(
        inquiriesRef,
        where('authorId', '==', currentUser.id || currentUser.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const inquiriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setInquiries(inquiriesData);
      }, (error) => {
        setError(error.message);
      });
      
      return unsubscribe;
    } catch (error) {
      setError(error.message);
      return null;
    }
  };

  const handleSubmitInquiry = async () => {
    try {
      if (!inquiryForm.title.trim() || !inquiryForm.content.trim()) {
        await Swal.fire({
          title: '오류',
          text: '제목과 내용을 모두 입력해주세요.',
          icon: 'error'
        });
        return;
      }

      const inquiryData = {
        title: inquiryForm.title.trim(),
        content: inquiryForm.content.trim(),
        category: inquiryForm.category,
        authorId: currentUser.id || currentUser.uid,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        replies: []
      };

      await addDoc(collection(db, 'inquiries'), inquiryData);

      // 폼 초기화
      setInquiryForm({
        title: '',
        content: '',
        category: '일반'
      });

      setShowInquiryDialog(false);

      await Swal.fire({
        title: '성공',
        text: '문의가 성공적으로 등록되었습니다.',
        icon: 'success'
      });

    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '문의 등록 중 오류가 발생했습니다.',
        icon: 'error'
      });
    }
  };

  const handleAddReply = async (inquiryId, replyContent) => {
    try {
      if (!replyContent.trim()) {
        await Swal.fire({
          title: '오류',
          text: '답글 내용을 입력해주세요.',
          icon: 'error'
        });
        return;
      }

      const replyData = {
        content: replyContent.trim(),
        authorId: currentUser.id || currentUser.uid,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        createdAt: new Date()
      };

      const inquiryRef = doc(db, 'inquiries', inquiryId);
      const inquiryDoc = await getDoc(inquiryRef);
      
      if (inquiryDoc.exists()) {
        const currentReplies = inquiryDoc.data().replies || [];
        await updateDoc(inquiryRef, {
          replies: [...currentReplies, replyData],
          updatedAt: new Date()
        });

        await Swal.fire({
          title: '성공',
          text: '답글이 성공적으로 등록되었습니다.',
          icon: 'success'
        });
      }
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '답글 등록 중 오류가 발생했습니다.',
        icon: 'error'
      });
    }
  };

  const fetchTeachers = async () => {
    try {
      // 모든 교사 정보 가져오기
      const teachersRef = collection(db, 'accounts');
      const q = query(
        teachersRef,
        where('role', 'in', ['homeroom_teacher', 'subject_teacher'])
      );
      
      // 실시간 업데이트를 위한 onSnapshot 사용
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const teachersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTeachers(teachersData);
      }, (error) => {
      });
      
      // cleanup 함수 반환
      return unsubscribe;
    } catch (error) {
    }
  };

  const fetchMeritReasons = async () => {
    try {
      const reasonsRef = collection(db, 'merit_reasons');
      const snapshot = await getDocs(reasonsRef);
      const reasonsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMeritReasons(reasonsData);
    } catch (error) {
    }
  };

  // 담임교사 정보를 이름(이메일) 형식으로 가져오는 함수
  const getHomeroomTeacherDisplay = (teacherId) => {
    if (!teacherId) return '담임교사 없음';
    
    // 담임교사 정보 찾기
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      return `${teacher.name} (${teacher.email})`;
    }
    
    return `ID: ${teacherId}`;
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
    }
  };

  const handleSendRequest = async () => {
    try {
      if (!requestForm.studentId) {
        await Swal.fire({
          title: '오류',
          text: '학생을 선택해주세요.',
          icon: 'error'
        });
        return;
      }

      if (!requestForm.reason) {
        await Swal.fire({
          title: '오류',
          text: '사유를 선택해주세요.',
          icon: 'error'
        });
        return;
      }

      // 선택된 학생 정보 가져오기
      const selectedStudentData = students.find(s => s.id === requestForm.studentId);
      if (!selectedStudentData) {
        await Swal.fire({
          title: '오류',
          text: '선택된 학생 정보를 찾을 수 없습니다.',
          icon: 'error'
        });
        return;
      }

      // 학생의 담임 교사 찾기
      const studentClass = classes.find(c => c.grade === selectedStudentData.grade && c.class === selectedStudentData.class);
      if (!studentClass) {
        await Swal.fire({
          title: '오류',
          text: '학생의 클래스 정보를 찾을 수 없습니다.',
          icon: 'error'
        });
        return;
      }

      // 담임 교사 ID 확인 (여러 필드에서 찾기)
      const homeroomTeacherId = studentClass.homeroomTeacherId || 
                                studentClass.homeroomTeacher || 
                                studentClass.teacherId;
      
      if (!homeroomTeacherId) {
        await Swal.fire({
          title: '오류',
          text: '학생의 담임 교사 ID를 찾을 수 없습니다.',
          icon: 'error'
        });
        return;
      }

      // 벌점일 때 음수로 변환
      const points = requestForm.type === 'demerit' ? -Math.abs(requestForm.value) : Math.abs(requestForm.value);
      
      const requestData = {
        ...requestForm,
        points: points,
        value: points,
        requestingTeacherId: currentUser.uid,
        requestingTeacherName: currentUser.name,
        requestingTeacherRole: currentUser.role,
        studentId: selectedStudentData.id,
        studentName: selectedStudentData.name,
        studentGrade: selectedStudentData.grade,
        studentClass: selectedStudentData.class,
        homeroomTeacherId: homeroomTeacherId,
        homeroomTeacherName: studentClass.homeroomTeacherName || studentClass.teacherName || '',
        status: 'pending',
        date: new Date(), // 상벌점 요청 날짜
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      
      const docRef = await addDoc(collection(db, 'merit_demerit_requests'), requestData);
      
      // 로그 기록
      try {
        await addDoc(collection(db, 'system_logs'), {
          userId: currentUser.uid,
          userName: currentUser.name || currentUser.email,
          userRole: currentUser.role,
          majorCategory: '상벌점 관리',
          middleCategory: '상벌점 요청',
          minorCategory: '',
          action: '상벌점 요청 전송',
          details: `${currentUser.name || currentUser.email}님이 ${selectedStudentData.name} 학생에게 상벌점 요청을 전송했습니다.`,
          timestamp: new Date(),
          createdAt: new Date()
        });
      } catch (logError) {
        // 로그 기록 오류 무시
      }
      
      setShowRequestDialog(false);
      setRequestForm({ studentId: '', type: 'merit', reason: '', value: 1, description: '' });
      setSelectedStudent(null);
      fetchSentRequests();
      
      await Swal.fire({
        title: '성공',
        text: '상벌점 요청이 성공적으로 전송되었습니다!',
        icon: 'success'
      });
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '요청 전송 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return '대기 중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거부됨';
      default:
        return '알 수 없음';
    }
  };

  if (!currentUser || currentUser.role !== 'subject_teacher') {
    return null;
  }

  // 로딩 상태 표시
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6">데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  // 오류 상태 표시
  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Typography variant="h6" color="error" gutterBottom>오류가 발생했습니다</Typography>
        <Typography variant="body1" color="text.secondary" align="center" gutterBottom>{error}</Typography>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          페이지 새로고침
        </Button>
      </Box>
    );
  }

  // 모바일과 PC를 구분하여 렌더링
  if (isMobileOrSmaller) {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        {/* 모바일 헤더 */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <IconButton
            onClick={toggleSidebar}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
            교과목 교사 대시보드
          </Typography>
        </Box>

        {/* 모바일 메인 콘텐츠 */}
        <Box sx={{ 
          p: 2, 
          width: '100%', 
          maxWidth: '100%',
          mx: 0
        }}>
          {/* 선생님 이름 */}
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
            {currentUser.name}선생님 ({currentUser.subject || '과목 미지정'})
          </Typography>

          {/* 통계 카드들 */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            mb: 3, 
            justifyContent: 'center',
            width: '100%'
          }}>
            <Card sx={{ 
              flex: 1, 
              textAlign: 'center', 
              p: 2,
              backgroundColor: 'white',
              boxShadow: 2
            }}>
              <GroupIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {students.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                담당 학생 수
              </Typography>
            </Card>
            <Card sx={{ 
              flex: 1, 
              textAlign: 'center', 
              p: 2,
              backgroundColor: 'white',
              boxShadow: 2
            }}>
              <SendIcon sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {sentRequests.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                전송한 요청
              </Typography>
            </Card>
            <Card sx={{ 
              flex: 1, 
              textAlign: 'center', 
              p: 2,
              backgroundColor: 'white',
              boxShadow: 2
            }}>
              <HistoryIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {sentRequests.filter(r => r.status === 'approved').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                승인된 요청
              </Typography>
            </Card>
          </Box>

          {/* 탭 버튼들 */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            mb: 3,
            width: '100%'
          }}>
            <Button
              variant={tabValue === 0 ? 'contained' : 'outlined'}
              onClick={() => setTabValue(0)}
              sx={{ flex: 1 }}
            >
              클래스별 학생
            </Button>
            <Button
              variant={tabValue === 1 ? 'contained' : 'outlined'}
              onClick={() => setTabValue(1)}
              sx={{ flex: 1 }}
            >
              요청 내역
            </Button>
          </Box>

          {/* 탭 콘텐츠 */}
          {tabValue === 0 && (
            <Box sx={{ width: '100%' }}>
              {/* 검색 및 필터 */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  placeholder="학생명, 학번, 클래스로 검색..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  sx={{ mb: 2 }}
                />
              </Box>

              {/* 학생 목록 카드들 */}
              {(() => {
                const filteredStudents = getFilteredStudents();
                
                if (filteredStudents.length === 0) {
                  return (
                    <Card sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        검색 결과가 없습니다.
                      </Typography>
                    </Card>
                  );
                }

                return filteredStudents.map((student) => (
                  <Card key={student.id} sx={{ mb: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {student.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {student.studentId} | {student.grade}학년 {student.class}반
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          담임: {getHomeroomTeacherDisplay(student.homeroomTeacherName || student.homeroom_teacher)}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedStudent(student);
                          setRequestForm({
                            ...requestForm,
                            studentId: student.id
                          });
                          setShowRequestDialog(true);
                        }}
                        sx={{ ml: 2 }}
                      >
                        상벌점 요청
                      </Button>
                    </Box>
                  </Card>
                ));
              })()}
            </Box>
          )}

          {tabValue === 1 && (
            <Box sx={{ width: '100%' }}>
              {sentRequests.length === 0 ? (
                <Card sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    전송된 요청이 없습니다.
                  </Typography>
                </Card>
              ) : (
                sentRequests.map((request) => (
                  <Card key={request.id} sx={{ mb: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {request.studentName}
                      </Typography>
                      <Chip
                        label={request.status === 'pending' ? '대기중' : request.status === 'approved' ? '승인됨' : '거부됨'}
                        color={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {request.grade}학년 {request.class}반 | {request.type === 'merit' ? '상점' : '벌점'} {request.points}점
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      사유: {request.reason} | 전송일: {formatDate(request.createdAt)}
                    </Typography>
                  </Card>
                ))
              )}
            </Box>
          )}
        </Box>

        {/* 모바일 사이드바 */}
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={toggleSidebar}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              backgroundColor: '#1976d2',
              color: 'white',
            },
          }}
        >
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <img 
                src={logoImage} 
                alt="로고" 
                style={{ 
                  width: '60px', 
                  height: 'auto' 
                }}
              />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              교과목 교사 대시보드
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
              {currentUser.name}
            </Typography>

            <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            
            <List sx={{ px: 1 }}>
              {[
                { text: '클래스별 학생', icon: <GroupIcon />, value: 0 },
                { text: '요청 내역', icon: <HistoryIcon />, value: 1 }
              ].map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      setTabValue(item.value);
                      setSidebarOpen(false);
                    }}
                    selected={tabValue === item.value}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            
            <Button
              fullWidth
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '&:hover': { 
                  borderColor: 'white', 
                  backgroundColor: 'rgba(255,255,255,0.1)' 
                }
              }}
            >
              로그아웃
            </Button>
          </Box>
        </Drawer>

        {/* 상벌점 요청 다이얼로그 */}
        <Dialog open={showRequestDialog} onClose={() => setShowRequestDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>상벌점 요청</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>학생 선택</InputLabel>
                  <Select
                    value={selectedStudent ? selectedStudent.id : requestForm.studentId}
                    onChange={(e) => setRequestForm({ ...requestForm, studentId: e.target.value })}
                    label="학생 선택"
                  >
                    {selectedStudent && (
                      <MenuItem value={selectedStudent.id}>
                        {selectedStudent.name} ({selectedStudent.studentId}) - {selectedStudent.grade}학년 {selectedStudent.class}반
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>구분</InputLabel>
                  <Select
                    value={requestForm.type}
                    onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                    label="구분"
                  >
                    <MenuItem value="merit">상점</MenuItem>
                    <MenuItem value="demerit">벌점</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="점수"
                  type="number"
                  value={requestForm.value}
                  onChange={(e) => setRequestForm({ ...requestForm, value: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, max: 10 }}
                />
                <FormControl fullWidth>
                  <InputLabel>사유</InputLabel>
                  <Select
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    label="사유"
                  >
                    {meritReasons
                      .filter(reason => reason.type === requestForm.type)
                      .map((reason) => (
                        <MenuItem key={reason.id} value={reason.reason}>
                          {reason.reason}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="상세 설명"
                  multiline
                  rows={3}
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  placeholder="상벌점 부여 사유를 자세히 설명해주세요"
                />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRequestDialog(false)}>취소</Button>
            <Button onClick={handleSendRequest} variant="contained">요청 전송</Button>
          </DialogActions>
        </Dialog>

        {/* 클래스별 학생 목록 다이얼로그 */}
        <Dialog open={showClassStudentsDialog} onClose={() => setShowClassStudentsDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedClass ? `${selectedClass.grade}학년 ${selectedClass.class}반 학생 목록` : '학생 목록'}
          </DialogTitle>
          <DialogContent>
            {selectedClass && (
              <div className="table-scroll-container">
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleStudentSort('studentId')}
                        >
                          학번 {studentSortConfig.key === 'studentId' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleStudentSort('name')}
                        >
                          이름 {studentSortConfig.key === 'name' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleStudentSort('cumulativeScore')}
                        >
                          누계 점수 {studentSortConfig.key === 'cumulativeScore' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell>상벌점 내역</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...selectedClass.students].sort((a, b) => {
                        let comparison = 0;
                        const aValue = a[studentSortConfig.key];
                        const bValue = b[studentSortConfig.key];

                        if (aValue === null || aValue === undefined) return 1;
                        if (bValue === null || bValue === undefined) return -1;
                        
                        if (studentSortConfig.key === 'cumulativeScore') {
                          const aScore = a.cumulativeScore || 0;
                          const bScore = b.cumulativeScore || 0;
                          comparison = aScore - bScore;
                        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                          comparison = aValue.localeCompare(bValue);
                        } else {
                          comparison = aValue - bValue;
                        }

                        return studentSortConfig.direction === 'asc' ? comparison : -comparison;
                      }).map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.cumulativeScore || 0}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewStudentHistory(student)}
                            >
                              내역 보기
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setSelectedStudent(student);
                                setRequestForm({
                                  ...requestForm,
                                  studentId: student.id
                                });
                                setShowRequestDialog(true);
                              }}
                            >
                              상벌점 요청
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowClassStudentsDialog(false)}>닫기</Button>
          </DialogActions>
        </Dialog>

        {/* 학생 상벌점 내역 다이얼로그 */}
        <Dialog open={showStudentHistoryDialog} onClose={() => setShowStudentHistoryDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedStudent ? `${selectedStudent.name} 상벌점 내역` : '상벌점 내역'}
          </DialogTitle>
          <DialogContent>
            {selectedStudent && (
              <Box>
                {studentMeritHistory.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      상벌점 내역이 없습니다.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'primary.main' }}>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>처리일시</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>구분</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>점수</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>사유</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>처리자</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {studentMeritHistory.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(record.date)}</TableCell>
                            <TableCell>
                              <Chip
                                label={record.type === 'merit' ? '상점' : '벌점'}
                                color={record.type === 'merit' ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{record.points}</TableCell>
                            <TableCell>{record.reason}</TableCell>
                            <TableCell>{record.processedBy}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowStudentHistoryDialog(false)}>닫기</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // PC 버전
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 모바일에서 사이드바 토글 버튼 */}
      <IconButton
        onClick={toggleSidebar}
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1300,
          backgroundColor: 'white',
          boxShadow: 2,
          display: { xs: 'flex', md: 'none' },
          '&:hover': {
            backgroundColor: 'grey.100'
          }
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* 사이드바 */}
      <Drawer
        variant="permanent"
        open={sidebarOpen}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.primary.main,
            color: 'white',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column'
          },
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 2 }}>
            <img 
              src={logoImage} 
              alt="로고" 
              style={{ 
                width: '60px', 
                height: 'auto'
              }}
            />
          </Box>
          <Typography 
            variant="h6" 
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            교과목 교사 대시보드
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ opacity: 0.8 }}
          >
            {currentUser.name}
          </Typography>
        </Box>
          <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <List sx={{ 
            mt: 2, 
            flexGrow: 1, 
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255,255,255,0.1)',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(255,255,255,0.5)',
            }
          }}>
            {[
              { text: '클래스별 학생', icon: <GroupIcon />, value: 0 },
              { text: '요청 내역', icon: <HistoryIcon />, value: 1 }
            ].map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setTabValue(item.value);
                    // 모바일에서 탭 클릭 시 사이드바 자동 닫기
                    if (isMobileOrSmaller) {
                      setSidebarOpen(false);
                    }
                  }}
                  selected={tabValue === item.value}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ mt: 'auto', p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              로그아웃
            </Button>
          </Box>
        </Drawer>

      {/* 메인 콘텐츠 - 사이드바 제외한 전체 영역 */}
      <Box sx={{
        flexGrow: 1, 
        overflowY: 'auto',
        overflowX: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: isMobileOrSmaller ? '100%' : 'calc(100vw - 280px)',
        minWidth: isMobileOrSmaller ? '320px' : '600px',
        maxWidth: isMobileOrSmaller ? '100vw' : '1600px',
        ml: isMobileOrSmaller && !sidebarOpen ? 0 : isMobileOrSmaller ? 0 : '280px',
        mx: 'auto',
        p: isMobileOrSmaller ? 1 : 2,
        // 가로 스크롤 스타일링
        '&::-webkit-scrollbar': {
          height: '8px',
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
          '&:hover': {
            background: '#555',
          },
        },
      }}>
        {/* 헤더 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2, 
          width: '100%',
          minWidth: isMobileOrSmaller ? '320px' : '600px',
          mt: isMobileOrSmaller ? 6 : 0,
          flexWrap: 'wrap',
          gap: 1,
        }}>
          <Typography variant={isMobileOrSmaller ? "h6" : "h5"} component="h1" sx={{ fontWeight: 'bold' }}>
            {currentUser.name}선생님 ({currentUser.subject || '과목 미지정'})
          </Typography>
        </Box>

        {/* 통계 카드 */}
        <Grid container spacing={isMobileOrSmaller ? 1 : 3} sx={{ 
          mb: 2, 
          width: '100%',
          minWidth: isMobileOrSmaller ? '320px' : '600px',
        }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', display: 'flex' }}>
              <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <GroupIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">{students.length}</Typography>
                <Typography color="text.secondary">담당 학생 수</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', display: 'flex' }}>
              <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <SendIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4">{sentRequests.length}</Typography>
                <Typography color="text.secondary">전송한 요청</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', display: 'flex' }}>
              <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <HistoryIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4">
                  {sentRequests.filter(r => r.status === 'approved').length}
                </Typography>
                <Typography color="text.secondary">승인된 요청</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

          {/* 탭 콘텐츠 */}
          {tabValue === 0 && (
            <Box sx={{ 
              width: '100%',
              minWidth: isMobileOrSmaller ? '320px' : '600px',
              overflowX: 'auto',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label="학생 검색"
                  variant="outlined"
                  size="small"
                  placeholder="이름, 학번, 클래스로 검색"
                  value={studentSearchTerm}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                  sx={{ minWidth: 300 }}
                />
                {studentSearchTerm && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleStudentSearch('')}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    초기화
                  </Button>
                )}
              </Box>
                <Button
                  variant="outlined"
                  startIcon={<SendIcon />}
                  onClick={() => {
                    setRequestForm({
                      studentId: '',
                      type: 'demerit',
                      value: 1,
                      reason: '',
                      details: ''
                    });
                    setShowRequestDialog(true);
                  }}
                  size={isSmallMobile ? "small" : isMobile ? "small" : isLargeDesktop ? "medium" : "medium"}
                >
                  상벌점 요청
                </Button>
              </Box>
              <div className="table-scroll-container">
                <TableContainer component={Paper}>
                  <Table>
                  {studentSearchTerm.trim() ? (
                    // 검색 시: 학생 목록 테이블
                    <>
                    <TableHead>
                      <TableRow>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleStudentSort('studentId')}
                          >
                            학번 {studentSortConfig.key === 'studentId' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleStudentSort('name')}
                          >
                            이름 {studentSortConfig.key === 'name' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleStudentSort('grade')}
                          >
                            학년/반/번호 {studentSortConfig.key === 'grade' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleStudentSort('homeroomTeacherName')}
                          >
                            담임교사 {studentSortConfig.key === 'homeroomTeacherName' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell>작업</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const filteredStudents = getFilteredStudents();
                          
                          if (filteredStudents.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  검색 결과가 없습니다.
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          // 정렬된 학생 목록 생성
                          const sortedStudents = [...filteredStudents].sort((a, b) => {
                            let comparison = 0;
                            let aValue, bValue;

                            switch (studentSortConfig.key) {
                              case 'studentId':
                                aValue = a.studentId;
                                bValue = b.studentId;
                                break;
                              case 'name':
                                aValue = a.name;
                                bValue = b.name;
                                break;
                              case 'grade':
                                aValue = `${a.grade}학년 ${a.class}반 ${a.number}번`;
                                bValue = `${b.grade}학년 ${b.class}반 ${b.number}번`;
                                break;
                              case 'homeroomTeacherName':
                                aValue = getHomeroomTeacherDisplay(a.homeroomTeacherName || a.homeroomTeacher);
                                bValue = getHomeroomTeacherDisplay(b.homeroomTeacherName || b.homeroomTeacher);
                                break;
                              default:
                                return 0;
                            }

                            if (aValue === null || aValue === undefined) return 1;
                            if (bValue === null || bValue === undefined) return -1;
                            
                            if (typeof aValue === 'string' && typeof bValue === 'string') {
                              comparison = aValue.localeCompare(bValue, 'ko-KR');
                            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                              comparison = aValue - bValue;
                            } else {
                              comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
                            }

                            return studentSortConfig.direction === 'asc' ? comparison : -comparison;
                          });
                          
                          return sortedStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>{student.studentId}</TableCell>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{student.grade}학년 {student.class}반 {student.number}번</TableCell>
                              <TableCell>{getHomeroomTeacherDisplay(student.homeroomTeacherName || student.homeroomTeacher)}</TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setRequestForm({
                                      studentId: student.id,
                                      type: 'demerit',
                                      value: 1,
                                      reason: '',
                                      details: ''
                                    });
                                    setShowRequestDialog(true);
                                  }}
                                >
                                  상벌점 요청
                                </Button>
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </>
                  ) : (
                    // 검색 없을 시: 클래스별 그룹 테이블
                    <>
                      <TableHead>
                        <TableRow>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleClassSort('className')}
                          >
                            클래스 {classSortConfig.key === 'className' && (classSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleClassSort('studentCount')}
                          >
                            학생 수 {classSortConfig.key === 'studentCount' && (classSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleClassSort('homeroomTeacher')}
                          >
                            담임교사 {classSortConfig.key === 'homeroomTeacher' && (classSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        // 교과 선생님이 담당하는 클래스들을 그룹화
                        const classGroups = {};
                        students.forEach(student => {
                          const classKey = `${student.grade}학년 ${student.class}반`;
                          if (!classGroups[classKey]) {
                            classGroups[classKey] = {
                              grade: student.grade,
                              class: student.class,
                              students: [],
                              homeroomTeacher: student.homeroomTeacherName || student.homeroomTeacher
                            };
                          }
                          classGroups[classKey].students.push(student);
                        });
                        
                        const classList = Object.values(classGroups);
                        
                        if (classList.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                담당 클래스가 없습니다.
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                          // 정렬된 클래스 목록 생성
                          const sortedClassList = [...classList].sort((a, b) => {
                            let comparison = 0;
                            let aValue, bValue;

                            switch (classSortConfig.key) {
                              case 'className':
                                aValue = `${a.grade}학년 ${a.class}반`;
                                bValue = `${b.grade}학년 ${b.class}반`;
                                break;
                              case 'studentCount':
                                aValue = a.students.length;
                                bValue = b.students.length;
                                break;
                              case 'homeroomTeacher':
                                aValue = getHomeroomTeacherDisplay(a.homeroomTeacher);
                                bValue = getHomeroomTeacherDisplay(b.homeroomTeacher);
                                break;
                              default:
                                return 0;
                            }

                            if (aValue === null || aValue === undefined) return 1;
                            if (bValue === null || bValue === undefined) return -1;
                            
                            if (typeof aValue === 'string' && typeof bValue === 'string') {
                              comparison = aValue.localeCompare(bValue, 'ko-KR');
                            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                              comparison = aValue - bValue;
                            } else {
                              comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
                            }

                            return classSortConfig.direction === 'asc' ? comparison : -comparison;
                          });
                          
                          return sortedClassList.map((classGroup, index) => (
                          <TableRow key={index}>
                            <TableCell>{`${classGroup.grade}학년 ${classGroup.class}반`}</TableCell>
                            <TableCell>{classGroup.students.length}명</TableCell>
                            <TableCell>{getHomeroomTeacherDisplay(classGroup.homeroomTeacher)}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setSelectedClass(classGroup);
                                  setShowClassStudentsDialog(true);
                                }}
                              >
                                학생 보기
                              </Button>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                    </>
                  )}
                  </Table>
                </TableContainer>
              </div>
            </Box>
          )}

          {tabValue === 1 && (
            <Box sx={{ 
              width: '100%',
              minWidth: isMobileOrSmaller ? '320px' : '600px',
              overflowX: 'auto',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <TextField
                  label="요청 검색"
                  variant="outlined"
                  size="small"
                  placeholder="학생명, 요청 내용으로 검색"
                  sx={{ minWidth: 300 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size={isSmallMobile ? "small" : isMobile ? "small" : isLargeDesktop ? "medium" : "medium"}
                  >
                    전체
                  </Button>
                  <Button
                    variant="outlined"
                    size={isSmallMobile ? "small" : isMobile ? "small" : isLargeDesktop ? "medium" : "medium"}
                  >
                    대기 중
                  </Button>
                  <Button
                    variant="outlined"
                    size={isSmallMobile ? "small" : isMobile ? "small" : isLargeDesktop ? "medium" : "medium"}
                  >
                    처리 완료
                  </Button>
                </Box>
              </Box>
              <div className="table-scroll-container">
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>전송일시</TableCell>
                        <TableCell>학생</TableCell>
                        <TableCell>구분</TableCell>
                        <TableCell>사유</TableCell>
                        <TableCell>점수</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>응답일시</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sentRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            전송한 요청이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sentRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>{formatDate(request.createdAt)}</TableCell>
                            <TableCell>{request.studentName || request.studentId}</TableCell>
                            <TableCell>
                              <Chip
                                icon={getTypeIcon(request.type)}
                                label={request.type === 'merit' ? '상점' : '벌점'}
                                color={getTypeColor(request.type)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{request.reason}</TableCell>
                            <TableCell>{request.value}점</TableCell>
                            <TableCell>
                              <Chip
                                label={getStatusText(request.status)}
                                color={getStatusColor(request.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {request.responseAt ? formatDate(request.responseAt) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </Box>
          )}

          {/* 클래스별 학생 목록 다이얼로그 */}
          <Dialog open={showClassStudentsDialog} onClose={() => setShowClassStudentsDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>
              {selectedClass ? `${selectedClass.grade}학년 ${selectedClass.class}반 학생 목록` : '학생 목록'}
            </DialogTitle>
            <DialogContent>
              {selectedClass && (
                <div className="table-scroll-container">
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleStudentSort('studentId')}
                          >
                            학번 {studentSortConfig.key === 'studentId' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleStudentSort('name')}
                          >
                            이름 {studentSortConfig.key === 'name' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleStudentSort('number')}
                          >
                            번호 {studentSortConfig.key === 'number' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                          <TableCell 
                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleStudentSort('birthDate')}
                          >
                            생년월일 {studentSortConfig.key === 'birthDate' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                          </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleStudentSort('cumulativeScore')}
                        >
                          누계 점수 {studentSortConfig.key === 'cumulativeScore' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell>상벌점 내역</TableCell>
                          <TableCell>작업</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...selectedClass.students].sort((a, b) => {
                          let comparison = 0;
                          const aValue = a[studentSortConfig.key];
                          const bValue = b[studentSortConfig.key];

                          if (aValue === null || aValue === undefined) return 1;
                          if (bValue === null || bValue === undefined) return -1;
                          
                        if (studentSortConfig.key === 'cumulativeScore') {
                          const aScore = a.cumulativeScore || 0;
                          const bScore = b.cumulativeScore || 0;
                          comparison = aScore - bScore;
                        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                            comparison = aValue.localeCompare(bValue, 'ko-KR');
                          } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                            comparison = aValue - bValue;
                          } else {
                            comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
                          }

                          return studentSortConfig.direction === 'asc' ? comparison : -comparison;
                        }).map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.studentId}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{student.number}번</TableCell>
                            <TableCell>{student.birthDate}</TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: (student.cumulativeScore || 0) >= 0 ? 'success.main' : 'error.main'
                              }}
                            >
                              {student.cumulativeScore || 0}점
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewStudentHistory(student)}
                            >
                              내역 보기
                            </Button>
                          </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setRequestForm({
                                    studentId: student.id,
                                    type: 'demerit',
                                    value: 1,
                                    reason: '',
                                    details: ''
                                  });
                                  setShowClassStudentsDialog(false);
                                  setShowRequestDialog(true);
                                }}
                              >
                                상벌점 요청
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowClassStudentsDialog(false)}>닫기</Button>
            </DialogActions>
          </Dialog>

          {/* 상벌점 요청 다이얼로그 */}
          <Dialog open={showRequestDialog} onClose={() => setShowRequestDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>상벌점 요청</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>학생</InputLabel>
                    <Select
                      value={selectedStudent ? selectedStudent.id : requestForm.studentId}
                      onChange={(e) => setRequestForm({...requestForm, studentId: e.target.value})}
                      label="학생"
                      size="medium"
                    >
                      {selectedStudent && (
                        <MenuItem value={selectedStudent.id}>
                          {selectedStudent.name} ({selectedStudent.studentId}) - {selectedStudent.grade}학년 {selectedStudent.class}반
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>구분</InputLabel>
                    <Select
                      value={requestForm.type}
                      onChange={(e) => setRequestForm({...requestForm, type: e.target.value})}
                      label="구분"
                      size="medium"
                    >
                      <MenuItem value="merit">상점</MenuItem>
                      <MenuItem value="demerit">벌점</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="점수"
                    type="number"
                    value={requestForm.value}
                    onChange={(e) => setRequestForm({...requestForm, value: parseInt(e.target.value)})}
                    inputProps={{ min: 1 }}
                    required
                    size="medium"
                  />
                  <FormControl fullWidth required>
                    <InputLabel>사유</InputLabel>
                    <Select
                      value={requestForm.reason}
                      onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                      label="사유"
                      size="medium"
                      required
                    >
                      {requestForm.type === 'merit' ? (
                        meritReasons.filter(reason => reason.type === 'merit').map((reason) => (
                          <MenuItem key={reason.id} value={reason.reason}>
                            {reason.reason}
                          </MenuItem>
                        ))
                      ) : (
                        meritReasons.filter(reason => reason.type === 'demerit').map((reason) => (
                          <MenuItem key={reason.id} value={reason.reason}>
                            {reason.reason}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="상세 내용"
                    multiline
                    rows={3}
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({...requestForm, description: e.target.value})}
                    placeholder="상벌점을 부여하는 구체적인 이유를 작성해주세요."
                    size="medium"
                  />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowRequestDialog(false)}>취소</Button>
              <Button onClick={handleSendRequest} variant="contained">요청 전송</Button>
            </DialogActions>
          </Dialog>

        {/* 학생 상벌점 내역 보기 다이얼로그 */}
        <Dialog 
          open={showStudentHistoryDialog} 
          onClose={() => setShowStudentHistoryDialog(false)} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle>
            {selectedStudentForHistory ? `${selectedStudentForHistory.name} 학생 상벌점 내역` : '학생 상벌점 내역'}
          </DialogTitle>
          <DialogContent>
            {selectedStudentForHistory && (
              <Box sx={{ mt: 2 }}>
                {/* 학생 정보 */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    학생 정보
            </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>학번:</strong> {selectedStudentForHistory.studentId}
            </Typography>
          </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>이름:</strong> {selectedStudentForHistory.name}
                </Typography>
          </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>학년/반/번호:</strong> {selectedStudentForHistory.grade}학년 {selectedStudentForHistory.class}반 {selectedStudentForHistory.number}번
                </Typography>
          </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>누계 점수:</strong> 
                        <Typography 
                          component="span" 
            sx={{
                            fontWeight: 'bold',
                            color: (selectedStudentForHistory.cumulativeScore || 0) >= 0 ? 'success.main' : 'error.main',
                            ml: 1
                          }}
                        >
                          {selectedStudentForHistory.cumulativeScore || 0}점
                        </Typography>
                      </Typography>
                    </Grid>
                  </Grid>
            </Box>
            
                {/* 상벌점 내역 테이블 */}
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  상벌점 내역
              </Typography>
            
                {studentMeritHistory.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                      상벌점 내역이 없습니다.
                </Typography>
              </Box>
                ) : (
              <TableContainer 
                component={Paper}
                sx={{
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    height: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f1f1f1',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#888',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: '#555',
                  },
                }}
              >
                    <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                        <TableRow sx={{ backgroundColor: 'primary.main' }}>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>처리일시</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>구분</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>사유</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>점수</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>처리교사</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>상세내용</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                        {studentMeritHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(record.createdAt)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Chip
                                icon={getTypeIcon(record.type)}
                                label={record.type === 'merit' ? '상점' : '벌점'}
                                color={getTypeColor(record.type)}
                              size="small"
                            />
                          </TableCell>
                            <TableCell>{record.reason}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  color: record.type === 'merit' ? 'success.main' : 'error.main'
                                }}
                              >
                                {record.type === 'merit' ? '+' : '-'}{record.value}점
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{record.teacherName || record.teacherId}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {record.description || '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                    </Table>
              </TableContainer>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowStudentHistoryDialog(false)}>닫기</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default SubjectTeacherDashboard;
