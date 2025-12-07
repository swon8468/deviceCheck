import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Container, Typography, Card, CardContent, Grid, Button, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Alert, useTheme, useMediaQuery, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Logout as LogoutIcon, School as SchoolIcon, Person as PersonIcon, Group as GroupIcon, Dashboard as DashboardIcon, Class as ClassIcon, FileUpload as FileUploadIcon, FileDownload as FileDownloadIcon, Warning as WarningIcon, AdminPanelSettings as AdminIcon, DeleteForever as DeleteForeverIcon, Refresh as RefreshIcon, CloudDownload as CloudDownloadIcon, Menu as MenuIcon, Assessment as AssessmentIcon
} from '@mui/icons-material';
import { Badge } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { getAuth, deleteUser } from 'firebase/auth';
import { sendPasswordResetEmail, verifyUserEmail } from '../utils/emailService';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDoc,
  query,
  where,
  writeBatch,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import Footer from '../components/Footer';
import LogViewer from '../components/LogViewer';
import { 
  logClassAction, 
  logStudentAction, 
  logUserAction, 
  logSystemAction, 
  logDataAction,
  logSecurityAction,
  logAuditAction,
  logDetailedAction,
  logError,
  logPerformance,
  LOG_CATEGORIES 
} from '../utils/logger';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import logoImage from '../img/logo.png';


const AdminDashboard = () => {
  const { currentUser, logout, restoreAdminAccount } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  
  // 사이드바 토글 함수
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [meritRecords, setMeritRecords] = useState([]);
  const [meritReasons, setMeritReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 반응형 디자인
  const theme = useTheme();
  const { isMobile, isTablet, isDesktop, isSmallMobile, isLargeDesktop, isMobileOrSmaller, isTabletOrLarger } = useResponsive();
  
  // 다이얼로그 상태
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  
  // 검색 상태
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // 초기화 동의 상태
  const [resetRequests, setResetRequests] = useState([]);
  const [showResetApprovalDialog, setShowResetApprovalDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showClassDetailsDialog, setShowClassDetailsDialog] = useState(false);
  const [showMeritReasonDialog, setShowMeritReasonDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [meritReasonForm, setMeritReasonForm] = useState({
    type: 'merit',
    reason: ''
  });
  const [classStudentSortConfig, setClassStudentSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });
  const [classDetails, setClassDetails] = useState({
    homeroomTeacher: null,
    subjectTeachers: [],
    students: []
  });
  
  // 학생 상벌점 로그 관련 상태
  const [showStudentMeritHistoryDialog, setShowStudentMeritHistoryDialog] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);
  const [studentMeritHistory, setStudentMeritHistory] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState('');
  
  // 정렬 상태
  const [classSortConfig, setClassSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });
  const [teacherSortConfig, setTeacherSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });
  const [studentSortConfig, setStudentSortConfig] = useState({
    key: 'studentId',
    direction: 'asc'
  });
  const [meritSortConfig, setMeritSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });
  const [allMeritRecords, setAllMeritRecords] = useState([]);
  const [selectedMeritRecord, setSelectedMeritRecord] = useState(null);
  const [showMeritDetailDialog, setShowMeritDetailDialog] = useState(false);

  // 정렬 함수들
  const handleClassSort = (key) => {
    setClassSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleTeacherSort = (key) => {
    setTeacherSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleStudentSort = (key) => {
    setStudentSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleMeritSort = (key) => {
    setMeritSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 정렬된 데이터들
  const sortedClasses = useMemo(() => {
    if (!classSortConfig.key) return classes;
    return [...classes].sort((a, b) => {
      let comparison = 0;
      
      if (classSortConfig.key === 'homeroomTeacher') {
        // 담임교사 이름으로 정렬
        const aTeacher = teachers.find(t => t.id === a.homeroomTeacher);
        const bTeacher = teachers.find(t => t.id === b.homeroomTeacher);
        const aName = aTeacher?.name || '';
        const bName = bTeacher?.name || '';
        comparison = aName.localeCompare(bName, 'ko-KR');
      } else {
        const aValue = a[classSortConfig.key];
        const bValue = b[classSortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue, 'ko-KR');
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
        }
      }
      
      return classSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [classes, classSortConfig, teachers]);

  const sortedTeachers = useMemo(() => {
    if (!teacherSortConfig.key) return teachers;
    return [...teachers].sort((a, b) => {
      const aValue = a[teacherSortConfig.key];
      const bValue = b[teacherSortConfig.key];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'ko-KR');
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
      }
      return teacherSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [teachers, teacherSortConfig]);

  const sortedStudents = useMemo(() => {
    if (!studentSortConfig.key) return students;
    return [...students].sort((a, b) => {
      let comparison = 0;
      
      if (studentSortConfig.key === 'grade') {
        // 학년/반/번호로 정렬 (학년 -> 반 -> 번호 순)
        const aGrade = parseInt(a.grade) || 0;
        const bGrade = parseInt(b.grade) || 0;
        const aClass = parseInt(a.class) || 0;
        const bClass = parseInt(b.class) || 0;
        const aNumber = parseInt(a.number) || 0;
        const bNumber = parseInt(b.number) || 0;
        
        if (aGrade !== bGrade) {
          comparison = aGrade - bGrade;
        } else if (aClass !== bClass) {
          comparison = aClass - bClass;
        } else {
          comparison = aNumber - bNumber;
        }
      } else {
        const aValue = a[studentSortConfig.key];
        const bValue = b[studentSortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue, 'ko-KR');
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
        }
      }
      
      return studentSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [students, studentSortConfig]);
  
  // 폼 데이터
  const [classForm, setClassForm] = useState({
    grade: '',
    class: '',
    name: '',
    homeroomTeacher: '',
    subjectTeachers: []
  });

  // 학년과 반이 변경될 때 클래스명 자동 업데이트
  useEffect(() => {
    if (classForm.grade && classForm.class) {
      const className = `${classForm.grade}학년 ${classForm.class}반`;
      setClassForm(prev => ({
        ...prev,
        name: className
      }));
    } else if (!classForm.grade || !classForm.class) {
      // 학년이나 반이 비어있으면 클래스명도 비우기
      setClassForm(prev => ({
        ...prev,
        name: ''
      }));
    }
  }, [classForm.grade, classForm.class]);
  
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    role: 'homeroom_teacher',
    phone: '',
    subject: '' // 교과목 추가
  });
  
  const [studentForm, setStudentForm] = useState({
    name: '',
    grade: '',
    class: '',
    number: '',
    birthDate: '',
    selectedClassId: ''
  });


  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchClasses(),
        fetchTeachers(),
        fetchStudents(),
        fetchMeritRecords(),
        fetchMeritReasons(),
        fetchAllMeritRecords(),
      ]);
      
      // 최고 관리자 대시보드 접근 로그 기록 (super_admin은 기록하지 않음)
      if (currentUser.role !== 'super_admin') {
        try {
          await addDoc(collection(db, 'system_logs'), {
            userId: currentUser.uid,
            userName: currentUser.name || currentUser.email,
            userRole: currentUser.role,
            majorCategory: '관리자 활동',
            middleCategory: '대시보드 접근',
            minorCategory: '',
            action: '최고 관리자 대시보드 접근',
            details: `${currentUser.name || currentUser.email}님이 최고 관리자 대시보드에 접근했습니다.`,
            timestamp: new Date(),
            createdAt: new Date()
          });
        } catch (logError) {
          // 로그 기록 오류 무시
        }
      }
    } catch (error) {
      // 데이터 조회 오류 처리
    } finally {
      setLoading(false);
    }
  };

  // 실시간 데이터 업데이트 설정
  useEffect(() => {
    if (!currentUser) return;

    // 클래스 실시간 업데이트
    const classesRef = collection(db, 'classes');
    const classesUnsubscribe = onSnapshot(classesRef, (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(classesData);
    });

    // 교사 실시간 업데이트
    const teachersRef = collection(db, 'accounts');
    const teachersQuery = query(teachersRef, where('role', 'in', ['homeroom_teacher', 'subject_teacher']));
    const teachersUnsubscribe = onSnapshot(teachersQuery, (snapshot) => {
      const teachersData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(teacher => teacher.status !== 'disabled'); // 활성화된 교사만 필터링
      setTeachers(teachersData);
    });

    // 학생 실시간 업데이트
    const studentsRef = collection(db, 'accounts');
    const studentsQuery = query(studentsRef, where('role', '==', 'student'));
    const studentsUnsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
    });

    // 초기화 요청 실시간 업데이트
    const resetRequestsRef = collection(db, 'reset_requests');
    const resetRequestsQuery = query(resetRequestsRef);
    const resetRequestsUnsubscribe = onSnapshot(resetRequestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestedAt: doc.data().requestedAt?.toDate?.() || new Date(doc.data().requestedAt),
        expiresAt: doc.data().expiresAt?.toDate?.() || new Date(doc.data().expiresAt)
      })).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
      setResetRequests(requestsData);
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      classesUnsubscribe();
      teachersUnsubscribe();
      studentsUnsubscribe();
      resetRequestsUnsubscribe();
    };
  }, [currentUser]);

  const fetchClasses = async () => {
    const classesRef = collection(db, 'classes');
    const snapshot = await getDocs(classesRef);
    const classesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setClasses(classesData);
  };

  const fetchMeritRecords = async () => {
    const meritRef = collection(db, 'merit_demerit_records');
    const snapshot = await getDocs(meritRef);
    const meritData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setMeritRecords(meritData);
    
    // 학생별 누적 점수 계산 및 업데이트
    await updateStudentCumulativeScores(meritData);
  };

  // 학생별 누적 점수 계산 및 업데이트 함수
  const updateStudentCumulativeScores = async (recordsData) => {
    
    
    // 학생별로 점수 합계 계산
    const studentScores = {};
    recordsData.forEach(record => {
      const studentId = record.studentId;
      if (!studentScores[studentId]) {
        studentScores[studentId] = 0;
      }
      
      // points 필드가 이미 상점은 양수, 벌점은 음수로 저장되어 있음
      const points = record.points || 0;
      studentScores[studentId] += points;
      
      
    });
    
    
    
    // accounts 컬렉션의 cumulativeScore 업데이트
    const updatePromises = Object.entries(studentScores).map(async ([studentId, score]) => {
      try {
        const accountRef = doc(db, 'accounts', studentId);
        await updateDoc(accountRef, {
          cumulativeScore: score
        });
        
      } catch (error) {
        // accounts 컬렉션 업데이트 실패
      }
    });
    
    await Promise.all(updatePromises);
    
    // 학생 데이터 업데이트
    setStudents(prevStudents => {
      const updatedStudents = prevStudents.map(student => {
        const cumulativeScore = studentScores[student.id] || 0;
        
        return {
          ...student,
          cumulativeScore: cumulativeScore
        };
      });
      return updatedStudents;
    });
  };

  const fetchMeritReasons = async () => {
    const reasonsRef = collection(db, 'merit_reasons');
    const snapshot = await getDocs(reasonsRef);
    const reasonsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setMeritReasons(reasonsData);
  };

  // 학생 상벌점 이력 조회 함수
  const fetchStudentMeritHistory = async (studentId) => {
    try {
    
      
      const meritRecordsRef = collection(db, 'merit_demerit_records');
      
      // studentId와 student_id 두 필드 모두 확인
      const q1 = query(meritRecordsRef, where('studentId', '==', studentId));
      const q2 = query(meritRecordsRef, where('student_id', '==', studentId));
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      const records1 = snapshot1.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));
      
      const records2 = snapshot2.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));
      
      // 중복 제거 (같은 문서가 두 쿼리에서 나올 수 있음)
      const allRecords = [...records1, ...records2];
      const uniqueRecords = allRecords.filter((record, index, self) => 
        index === self.findIndex(r => r.id === record.id)
      );
      
      // 최신순으로 정렬
      const sortedRecords = uniqueRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      
      setStudentMeritHistory(sortedRecords);
      return sortedRecords;
    } catch (error) {
      setError('학생 상벌점 이력 조회 중 오류가 발생했습니다: ' + error.message);
      return [];
    }
  };

  const fetchTeachers = async () => {
    const teachersRef = collection(db, 'accounts');
    const q = query(teachersRef, where('role', 'in', ['homeroom_teacher', 'subject_teacher']));
    const snapshot = await getDocs(q);
    const teachersData = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(teacher => teacher.status !== 'deleted' && teacher.status !== 'disabled'); // 삭제되지 않은 활성화된 교사만 필터링
    setTeachers(teachersData);
  };

  const fetchStudents = async () => {
    const studentsRef = collection(db, 'accounts');
    const q = query(studentsRef, where('role', '==', 'student'));
    const snapshot = await getDocs(q);
    const studentsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setStudents(studentsData);
  };

  // 모든 상벌점 기록 조회 (기존 fetchStudentMeritHistory 로직 활용)
  const fetchAllMeritRecords = useCallback(async () => {
    try {
      const recordsRef = collection(db, 'merit_demerit_records');
      const q = query(recordsRef, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const recordsData = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // 처리 교사 정보 설정 (HomeroomTeacherDashboard의 로직 활용)
          let processedTeacherName = 'N/A';
          
          // 1. processedByName이 있으면 사용 (요청 승인 시 설정된 처리교사)
          if (data.processedByName) {
            processedTeacherName = data.processedByName;
          }
          // 2. requesterName이 있으면 사용 (요청한 교사)
          else if (data.requesterName) {
            processedTeacherName = data.requesterName;
          }
          // 3. teacherName이 있으면 사용 (기존 필드)
          else if (data.teacherName) {
            processedTeacherName = data.teacherName;
          }
          // 4. 담임교사가 직접 등록한 경우 담임교사 이름 사용
          else if (data.creatorRole === 'homeroom_teacher' && data.creatorName) {
            processedTeacherName = data.creatorName;
          }
          // 5. creatorName이 있으면 사용
          else if (data.creatorName) {
            processedTeacherName = data.creatorName;
          }
          
          return {
            id: doc.id,
            ...data,
            points: data.points || data.value || 0,
            value: data.points || data.value || 0, // 호환성을 위해
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : null),
            processedTeacherName: processedTeacherName
          };
        });
        
        // 중복 제거 (같은 문서가 여러 번 나올 수 있음)
        const uniqueRecords = recordsData.filter((record, index, self) => 
          index === self.findIndex(r => r.id === record.id)
        );
        
        setAllMeritRecords(uniqueRecords);
      }, (error) => {
        setError('상벌점 기록 조회 중 오류가 발생했습니다: ' + error.message);
      });

      return unsubscribe;
    } catch (error) {
      setError('상벌점 기록 조회 중 오류가 발생했습니다: ' + error.message);
      return null;
    }
  }, []);


  // 비밀번호 재설정 이메일 발송 (SweetAlert 사용)
  const handlePasswordReset = async (email) => {
    try {
      
      if (!email || !email.trim()) {
        await Swal.fire({
          title: '오류',
          text: '이메일을 입력해주세요.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await Swal.fire({
          title: '오류',
          text: '올바른 이메일 형식을 입력해주세요.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      // 사용자 존재 확인
      const userVerification = await verifyUserEmail(email);
      if (!userVerification.success) {
        await Swal.fire({
          title: '오류',
          text: userVerification.message,
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      // 비밀번호 재설정 이메일 발송
      const result = await sendPasswordResetEmail(email);
      
      if (result.success) {
        await Swal.fire({
          title: '성공',
          text: result.message,
          icon: 'success',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        
        // 시스템 로그 기록 (super_admin은 기록하지 않음)
        if (currentUser.role !== 'super_admin') {
          try {
            await addDoc(collection(db, 'system_logs'), {
              userId: currentUser.uid,
              userName: currentUser.name || currentUser.email,
              userRole: currentUser.role,
              majorCategory: '관리자 활동',
              middleCategory: '비밀번호 관리',
              minorCategory: '',
              action: '비밀번호 재설정 이메일 발송',
              details: `${currentUser.name || currentUser.email}님이 ${email}에게 비밀번호 재설정 이메일을 발송했습니다.`,
              timestamp: new Date(),
              createdAt: new Date()
          });
        } catch (logError) {
          // 로그 기록 오류 무시
        }
      }
      } else {
        await Swal.fire({
          title: '오류',
          text: result.message,
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
      }
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '비밀번호 재설정 중 오류가 발생했습니다.',
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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

  // 검색된 데이터 필터링
  const filteredClasses = classes.filter(cls => 
    cls.name?.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
    cls.grade?.toString().includes(classSearchTerm) ||
    cls.class?.toString().includes(classSearchTerm)
  );

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name?.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
    teacher.role?.toLowerCase().includes(teacherSearchTerm.toLowerCase())
  );

  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    student.grade?.toString().includes(studentSearchTerm) ||
    student.class?.toString().includes(studentSearchTerm)
  );

  // 검색된 데이터를 정렬된 데이터로 변환
  const sortedFilteredClasses = useMemo(() => {
    if (!classSortConfig.key) return filteredClasses;
    return [...filteredClasses].sort((a, b) => {
      let comparison = 0;
      
      if (classSortConfig.key === 'homeroomTeacher') {
        // 담임교사 이름으로 정렬
        const aTeacher = teachers.find(t => t.id === a.homeroomTeacher);
        const bTeacher = teachers.find(t => t.id === b.homeroomTeacher);
        const aName = aTeacher?.name || '';
        const bName = bTeacher?.name || '';
        comparison = aName.localeCompare(bName, 'ko-KR');
      } else {
        const aValue = a[classSortConfig.key];
        const bValue = b[classSortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue, 'ko-KR');
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
        }
      }
      
      return classSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredClasses, classSortConfig, teachers]);

  // 클래스별 상벌점 누계 계산
  const getClassMeritSum = (classData) => {
    const classStudents = students.filter(student => 
      student.grade === classData.grade && student.class === classData.class
    );
    
    return classStudents.reduce((sum, student) => {
      return sum + (student.cumulativeScore || 0);
    }, 0);
  };

  const handleAddMeritReason = async () => {
    try {
      if (!meritReasonForm.reason.trim()) {
        await Swal.fire({
          title: '오류',
          text: '사유를 입력해주세요.',
          icon: 'error'
        });
        return;
      }

      await addDoc(collection(db, 'merit_reasons'), {
        type: meritReasonForm.type,
        reason: meritReasonForm.reason.trim(),
        createdAt: new Date()
      });

      await fetchMeritReasons();
      setMeritReasonForm({ type: 'merit', reason: '' });
      setShowMeritReasonDialog(false);

      await Swal.fire({
        title: '성공',
        text: '상벌점 사유가 추가되었습니다.',
        icon: 'success'
      });
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '사유 추가 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
  };

  const handleClassStudentSort = (key) => {
    setClassStudentSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedFilteredTeachers = useMemo(() => {
    if (!teacherSortConfig.key) return filteredTeachers;
    return [...filteredTeachers].sort((a, b) => {
      const aValue = a[teacherSortConfig.key];
      const bValue = b[teacherSortConfig.key];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'ko-KR');
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
      }
      return teacherSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredTeachers, teacherSortConfig]);

  // 정렬된 상벌점 기록
  const sortedMeritRecords = useMemo(() => {
    if (!meritSortConfig.key) return allMeritRecords;
    return [...allMeritRecords].sort((a, b) => {
      let comparison = 0;
      const aValue = a[meritSortConfig.key];
      const bValue = b[meritSortConfig.key];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (meritSortConfig.key === 'createdAt') {
        comparison = new Date(aValue) - new Date(bValue);
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'ko-KR');
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
      }
      return meritSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [allMeritRecords, meritSortConfig]);

  // 정렬된 필터링된 학생 데이터
  const sortedFilteredStudents = useMemo(() => {
    if (!studentSortConfig.key) return filteredStudents;
    return [...filteredStudents].sort((a, b) => {
      let comparison = 0;
      
      if (studentSortConfig.key === 'grade') {
        // 학년/반/번호로 정렬 (학년 -> 반 -> 번호 순)
        const aGrade = parseInt(a.grade) || 0;
        const bGrade = parseInt(b.grade) || 0;
        const aClass = parseInt(a.class) || 0;
        const bClass = parseInt(b.class) || 0;
        const aNumber = parseInt(a.number) || 0;
        const bNumber = parseInt(b.number) || 0;
        
        if (aGrade !== bGrade) {
          comparison = aGrade - bGrade;
        } else if (aClass !== bClass) {
          comparison = aClass - bClass;
        } else {
          comparison = aNumber - bNumber;
        }
      } else if (studentSortConfig.key === 'cumulativeScore') {
        // 누계 점수로 정렬 (숫자 정렬)
        const aScore = parseFloat(a.cumulativeScore) || 0;
        const bScore = parseFloat(b.cumulativeScore) || 0;
        comparison = aScore - bScore;
      } else {
        const aValue = a[studentSortConfig.key];
        const bValue = b[studentSortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue, 'ko-KR');
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
        }
      }
      
      return studentSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredStudents, studentSortConfig]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // 로그아웃 오류 처리
    }
  };

  const handleUpdateClass = async () => {
    try {
      if (!classForm.grade || !classForm.class) {
        setError('모든 필드를 입력해주세요.');
        return;
      }

      // 원래 클래스 정보 가져오기
      const originalClass = classes.find(c => c.id === editingItem.id);
      if (!originalClass) {
        await Swal.fire({
          title: '오류',
          text: '클래스를 찾을 수 없습니다.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      const newGrade = parseInt(classForm.grade);
      const newClass = parseInt(classForm.class);
      const oldGrade = originalClass.grade;
      const oldClass = originalClass.class;

      // 학년/반이 변경되었는지 확인
      const isGradeOrClassChanged = (oldGrade !== newGrade) || (oldClass !== newClass);

      // 학년/반이 변경된 경우, 새로운 학년/반 조합이 이미 존재하는지 확인
      if (isGradeOrClassChanged) {
        const existingClass = classes.find(c => 
          c.grade === newGrade && 
          c.class === newClass && 
          c.id !== editingItem.id // 현재 수정 중인 클래스는 제외
        );
        
        if (existingClass) {
          await Swal.fire({
            title: '오류',
            text: `${newGrade}학년 ${newClass}반은 이미 존재합니다. 중복된 클래스로 변경할 수 없습니다.`,
            icon: 'error',
            customClass: {
              container: 'swal2-container-high-z'
            }
          });
          return;
        }

        // 매우 위험한 작업이므로 확인 다이얼로그 표시 (2단계 확인)
        const firstConfirm = await Swal.fire({
          title: '⚠️ 매우 위험한 작업',
          html: `
            <div style="text-align: left;">
              <p><strong>클래스 이름을 변경하시겠습니까?</strong></p>
              <p style="color: #d32f2f; font-weight: bold;">⚠️ 이 작업은 되돌릴 수 없습니다!</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>클래스 이름: <strong>${oldGrade}학년 ${oldClass}반</strong> → <strong>${newGrade}학년 ${newClass}반</strong></li>
                <li>해당 클래스의 <strong>모든 학생</strong>의 학년/반 정보도 함께 변경됩니다</li>
                <li>학생들의 학번(studentId)도 자동으로 재생성됩니다</li>
                <li>이 작업은 영구적으로 적용되며 복구할 수 없습니다</li>
              </ul>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: '계속',
          cancelButtonText: '취소',
          confirmButtonColor: '#ff9800',
          cancelButtonColor: '#6c757d',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });

        if (!firstConfirm.isConfirmed) {
          return;
        }

        // 2단계 최종 확인
        const finalConfirm = await Swal.fire({
          title: '⚠️ 최종 확인',
          html: `
            <div style="text-align: center;">
              <p style="font-size: 18px; font-weight: bold; color: #d32f2f; margin-bottom: 20px;">
                정말로 변경하시겠습니까?
              </p>
              <p style="font-size: 16px; margin-bottom: 10px;">
                <strong>${oldGrade}학년 ${oldClass}반</strong> → <strong>${newGrade}학년 ${newClass}반</strong>
              </p>
              <p style="color: #d32f2f; font-weight: bold;">
                이 작업은 되돌릴 수 없습니다!
              </p>
            </div>
          `,
          icon: 'error',
          showCancelButton: true,
          confirmButtonText: '변경 실행',
          cancelButtonText: '취소',
          confirmButtonColor: '#d32f2f',
          cancelButtonColor: '#6c757d',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });

        if (!finalConfirm.isConfirmed) {
          return;
        }

        if (!confirmResult.isConfirmed) {
          return;
        }
      }

      // 담임 교사가 이미 다른 클래스를 담당하고 있는지 확인 (활성화된 교사만 고려, 현재 클래스 제외)
      if (classForm.homeroomTeacher) {
        const existingClass = classes.find(c => 
          c.homeroomTeacher === classForm.homeroomTeacher && 
          c.id !== editingItem.id // 현재 수정 중인 클래스는 제외
        );
        if (existingClass) {
          await Swal.fire({
            title: '오류',
            text: '이 담임 교사는 이미 다른 클래스를 담당하고 있습니다. 담임 교사는 최대 1개의 클래스만 담당할 수 있습니다.',
            icon: 'error',
            customClass: {
              container: 'swal2-container-high-z'
            }
          });
          return;
        }
      }

      const classData = {
        name: `${classForm.grade}학년 ${classForm.class}반`,
        grade: newGrade,
        class: newClass,
        homeroomTeacher: classForm.homeroomTeacher,
        homeroomTeacherId: classForm.homeroomTeacher, // homeroomTeacherId도 함께 설정
        subjectTeachers: classForm.subjectTeachers,
        updatedAt: new Date()
      };
      
      // 클래스 정보 업데이트
      await updateDoc(doc(db, 'classes', editingItem.id), classData);

      // 학년/반이 변경된 경우, 해당 클래스의 모든 학생들의 학년/반 정보도 업데이트
      if (isGradeOrClassChanged) {
        
        // 기존 클래스의 모든 학생 조회
        const studentsRef = collection(db, 'accounts');
        const oldStudentsQuery = query(
          studentsRef, 
          where('role', '==', 'student'),
          where('grade', '==', oldGrade),
          where('class', '==', oldClass)
        );
        const oldStudentsSnapshot = await getDocs(oldStudentsQuery);
        
        
        // 배치 업데이트를 사용하여 모든 학생의 학년/반 정보 업데이트
        const batch = writeBatch(db);
        let updateCount = 0;
        
        oldStudentsSnapshot.forEach((studentDoc) => {
          const studentData = studentDoc.data();
          
          // 새로운 학번 생성
          const newStudentId = `${newGrade}${newClass.toString().padStart(2, '0')}${studentData.number.toString().padStart(2, '0')}`;
          
          
          batch.update(studentDoc.ref, {
            grade: newGrade,
            class: newClass,
            studentId: newStudentId,
            updatedAt: new Date()
          });
          updateCount++;
        });
        
        // 배치 업데이트 실행
        if (updateCount > 0) {
          await batch.commit();
          
          // 업데이트 확인을 위해 다시 조회
          const newStudentsQuery = query(
            studentsRef, 
            where('role', '==', 'student'),
            where('grade', '==', newGrade),
            where('class', '==', newClass)
          );
          const verifySnapshot = await getDocs(newStudentsQuery);
        }
      }
      
      // 담임 교사가 변경된 경우, 해당 클래스의 모든 학생들의 담임 교사 정보도 업데이트
      if (classForm.homeroomTeacher) {
        
        // 기존 담임 교사가 다른 교사인 경우, 이전 담임 교사가 담당하던 다른 클래스의 학생들도 확인
        if (originalClass.homeroomTeacher && originalClass.homeroomTeacher !== classForm.homeroomTeacher) {
          
          // 이전 담임 교사가 담당하던 다른 클래스의 학생들 조회
          const otherClassesQuery = query(
            collection(db, 'classes'),
            where('homeroomTeacher', '==', originalClass.homeroomTeacher)
          );
          const otherClassesSnapshot = await getDocs(otherClassesQuery);
          
          if (otherClassesSnapshot.size > 0) {
            
            // 각 클래스의 학생들 조회하여 담임 교사 정보 업데이트
            for (const classDoc of otherClassesSnapshot.docs) {
              const classData = classDoc.data();
              const otherStudentsQuery = query(
                collection(db, 'accounts'),
                where('role', '==', 'student'),
                where('grade', '==', classData.grade),
                where('class', '==', classData.class)
              );
              const otherStudentsSnapshot = await getDocs(otherStudentsQuery);
              
              if (otherStudentsSnapshot.size > 0) {
                const otherBatch = writeBatch(db);
                otherStudentsSnapshot.forEach((studentDoc) => {
                  const studentData = studentDoc.data();
                  
                  otherBatch.update(studentDoc.ref, {
                    homeroomTeacher: null,
                    homeroomTeacherId: null,
                    updatedAt: new Date()
                  });
                });
                await otherBatch.commit();
              }
            }
          }
        }
        
        // 해당 클래스의 모든 학생 조회 (새로운 학년/반 기준)
        const studentsRef = collection(db, 'accounts');
        const studentsQuery = query(
          studentsRef, 
          where('role', '==', 'student'),
          where('grade', '==', newGrade),
          where('class', '==', newClass)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        
        
        // 배치 업데이트를 사용하여 모든 학생의 담임 교사 정보 업데이트
        const batch = writeBatch(db);
        let updateCount = 0;
        
        studentsSnapshot.forEach((studentDoc) => {
          const studentData = studentDoc.data();
          
          batch.update(studentDoc.ref, {
            homeroomTeacher: classForm.homeroomTeacher,
            homeroomTeacherId: classForm.homeroomTeacher,
            updatedAt: new Date()
          });
          updateCount++;
        });
        
        // 배치 업데이트 실행
        if (updateCount > 0) {
          await batch.commit();
          
          // 업데이트 확인을 위해 다시 조회
          const verifySnapshot = await getDocs(studentsQuery);
        }
      }
      
      // 모달창을 먼저 닫고 SweetAlert 표시
      setShowClassDialog(false);
      setEditingItem(null);
      setClassForm({ grade: '', class: '', name: '', homeroomTeacher: '', subjectTeachers: [] });
      
      // 데이터 새로고침
      await fetchClasses();
      await fetchStudents(); // 학생 정보도 새로고침
      
      // 성공 메시지 표시
      let successMessage = '클래스 정보가 성공적으로 수정되었습니다!';
      if (isGradeOrClassChanged) {
        successMessage = `클래스 이름이 ${oldGrade}학년 ${oldClass}반에서 ${newGrade}학년 ${newClass}반으로 변경되었고, 해당 클래스의 모든 학생 정보도 함께 업데이트되었습니다!`;
      } else if (classForm.homeroomTeacher) {
        successMessage = '클래스와 해당 클래스 학생들의 담임 교사 정보가 성공적으로 수정되었습니다!';
      }
      
      await Swal.fire({
        title: '성공',
        text: successMessage,
        icon: 'success',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    } catch (error) {
      setError('클래스 수정 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleAddClass = async () => {
    try {
      // 필수 필드 검증: 학년, 반, 담임교사
      if (!classForm.grade || !classForm.class || !classForm.homeroomTeacher) {
        await Swal.fire({
          title: '오류',
          text: '학년, 반, 담임교사를 모두 입력해주세요.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      // 클래스명 자동 생성
      const className = `${classForm.grade}학년 ${classForm.class}반`;
      
      // 동일한 학년/반 조합이 이미 존재하는지 확인
      const existingClass = classes.find(c => c.grade === classForm.grade && c.class === classForm.class);
      if (existingClass) {
        await Swal.fire({
          title: '오류',
          text: `${className}은(는) 이미 존재합니다.`,
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      // 담임 교사가 이미 다른 클래스를 담당하고 있는지 확인 (활성화된 교사만 고려)
      if (classForm.homeroomTeacher) {
        const existingClass = classes.find(c => c.homeroomTeacher === classForm.homeroomTeacher);
        if (existingClass) {
          await Swal.fire({
            title: '오류',
            text: '이 담임 교사는 이미 다른 클래스를 담당하고 있습니다. 담임 교사는 최대 1개의 클래스만 담당할 수 있습니다.',
            icon: 'error',
            customClass: {
              container: 'swal2-container-high-z'
            }
          });
          return;
        }
      }

      const classData = {
        ...classForm,
        grade: parseInt(classForm.grade),
        class: parseInt(classForm.class),
        name: className,
        homeroomTeacherId: classForm.homeroomTeacher, // homeroomTeacherId도 함께 설정
        students: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const classDocRef = await addDoc(collection(db, 'classes'), classData);
      
      // 담임 교사가 지정된 경우, 해당 클래스의 모든 학생들의 담임 교사 정보도 업데이트
      if (classForm.homeroomTeacher) {
        
        // 해당 클래스의 모든 학생 조회
        const studentsRef = collection(db, 'accounts');
        const studentsQuery = query(
          studentsRef, 
          where('role', '==', 'student'),
          where('grade', '==', parseInt(classForm.grade)),
          where('class', '==', parseInt(classForm.class))
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        
        
        // 배치 업데이트를 사용하여 모든 학생의 담임 교사 정보 업데이트
        if (studentsSnapshot.size > 0) {
          const batch = writeBatch(db);
          let updateCount = 0;
          
          studentsSnapshot.forEach((studentDoc) => {
            const studentData = studentDoc.data();
            
            batch.update(studentDoc.ref, {
              homeroomTeacher: classForm.homeroomTeacher,
              homeroomTeacherId: classForm.homeroomTeacher,
              updatedAt: new Date()
            });
            updateCount++;
          });
          
          // 배치 업데이트 실행
          await batch.commit();
          
          // 업데이트 확인을 위해 다시 조회
          const verifySnapshot = await getDocs(studentsQuery);
        }
      }
      
      // 로그 기록 (super_admin은 기록하지 않음)
      if (currentUser.role !== 'super_admin') {
        try {
          await addDoc(collection(db, 'system_logs'), {
            userId: currentUser.uid,
            userName: currentUser.name || currentUser.email,
            userRole: currentUser.role,
            majorCategory: '클래스 관리',
            middleCategory: '클래스 생성',
            minorCategory: '',
            action: '클래스 생성',
            details: `${currentUser.name || currentUser.email}님이 ${className}을(를) 생성했습니다.`,
            timestamp: new Date(),
            createdAt: new Date()
          });
        } catch (logError) {
          // 로그 기록 오류 처리
        }
      }
      
      // 모달창을 먼저 닫고 SweetAlert 표시
      setShowClassDialog(false);
      setClassForm({ grade: '', class: '', name: '', homeroomTeacher: '', subjectTeachers: [] });
      
      // 데이터 새로고침
      await fetchClasses();
      
      // 성공 메시지 표시
      const successMessage = classForm.homeroomTeacher 
        ? `${className}이(가) 성공적으로 생성되었고, 해당 클래스 학생들의 담임 교사 정보가 업데이트되었습니다!`
        : `${className}이(가) 성공적으로 생성되었습니다!`;
        
      await Swal.fire({
        title: '성공',
        text: successMessage,
        icon: 'success'
      });
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '클래스 생성 중 오류가 발생했습니다: ' + error.message,
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  const handleUpdateTeacher = async () => {
    try {
      setError('');
      
      if (!teacherForm.name) {
        setError('이름을 입력해주세요.');
        return;
      }

      // 담임 교사인 경우 담당 과목은 필수가 아님
      if (teacherForm.role === 'subject_teacher' && !teacherForm.subject) {
        await Swal.fire({
          title: '오류',
          text: '교과목 교사의 경우 담당 과목을 입력해주세요.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      const teacherData = {
        name: teacherForm.name,
        role: teacherForm.role,
        phone: teacherForm.phone,
        subject: teacherForm.subject || '',
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'accounts', editingItem.id), teacherData);
      setShowTeacherDialog(false);
      setEditingItem(null);
        setTeacherForm({ name: '', email: '', role: 'homeroom_teacher', phone: '', subject: '' });
      fetchTeachers();
      setError('');
              await Swal.fire({
          title: '성공',
          text: '교사 정보가 성공적으로 수정되었습니다!',
          icon: 'success',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
    } catch (error) {
      setError('교사 정보 수정 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleAddTeacher = async () => {
    try {
      setError('');
      
      if (!teacherForm.name || !teacherForm.email) {
        await Swal.fire({
          title: '오류',
          text: '이름과 이메일을 입력해주세요.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      // 담임 교사인 경우 담당 과목은 필수가 아님
      if (teacherForm.role === 'subject_teacher' && !teacherForm.subject) {
        await Swal.fire({
          title: '오류',
          text: '교과목 교사의 경우 담당 과목을 입력해주세요.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      // 이메일 중복 확인
      const existingTeacher = teachers.find(t => t.email === teacherForm.email);
      if (existingTeacher) {
        await Swal.fire({
          title: '오류',
          text: '이미 존재하는 이메일입니다.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      const teacherData = {
        name: teacherForm.name,
        email: teacherForm.email,
        role: teacherForm.role,
        phone: teacherForm.phone,
        subject: teacherForm.subject || '', // 교과목 추가
        assignedClasses: []
      };

      // 현재 로그인된 관리자 정보 저장
      const currentAdminData = currentUser;
      
      // Firebase Auth를 사용하여 교사 계정 생성 (비밀번호 없이)
      const { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, signInWithEmailAndPassword } = await import('firebase/auth');
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      
      // 임시 비밀번호로 계정 생성
      const tempPassword = Math.random().toString(36).slice(-8) + '!@#';
      
      try {
        // 새 교사 계정 생성
        const userCredential = await createUserWithEmailAndPassword(auth, teacherForm.email, tempPassword);
        
        // Firestore에 교사 정보 저장
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        await setDoc(doc(db, 'accounts', userCredential.user.uid), {
          ...teacherData,
          uid: userCredential.user.uid,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // 계정 생성 후 즉시 비밀번호 재설정 이메일 발송
        await sendPasswordResetEmail(auth, teacherForm.email);
        
        // 새로 생성된 계정에서 로그아웃
        await signOut(auth);
        
        // 원래 관리자 계정으로 복원
        if (currentAdminData && currentAdminData.uid) {
          try {
            const restoreResult = await restoreAdminAccount(currentAdminData.uid);
            if (!restoreResult.success) {
              // 복원 실패 시에도 계정 생성은 성공했으므로 계속 진행
            }
          } catch (restoreError) {
            // 복원 실패 시에도 계정 생성은 성공했으므로 계속 진행
          }
        }
        
        setShowTeacherDialog(false);
        setTeacherForm({ name: '', email: '', role: 'homeroom_teacher', phone: '', subject: '' });
        fetchTeachers();
        setError('');
        
        await Swal.fire({
          title: '성공',
          text: '교사 계정이 성공적으로 생성되었습니다! 비밀번호 설정 이메일이 발송되었습니다.',
          icon: 'success',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        
        // 시스템 로그 기록
        // super_admin은 기록하지 않음
        if (currentAdminData.role !== 'super_admin') {
          try {
            const { addDoc, collection } = await import('firebase/firestore');
            await addDoc(collection(db, 'system_logs'), {
              userId: currentAdminData.uid,
              userName: currentAdminData.name || currentAdminData.email,
              userRole: currentAdminData.role,
              majorCategory: '관리자 활동',
              middleCategory: '교사 관리',
              minorCategory: '계정 생성',
              action: '교사 계정 생성 및 비밀번호 설정 이메일 발송',
              details: `${currentAdminData.name || currentAdminData.email}님이 ${teacherForm.name}(${teacherForm.email}) 교사 계정을 생성하고 비밀번호 설정 이메일을 발송했습니다.`,
              timestamp: new Date(),
              createdAt: new Date()
            });
          } catch (logError) {
            // 로그 기록 오류 무시
          }
        }
        
      } catch (authError) {
        
        // Firebase Auth 오류를 SweetAlert로 표시
        let errorMessage = '교사 계정 생성 중 오류가 발생했습니다.';
        
        if (authError.code === 'auth/email-already-in-use') {
          errorMessage = '이미 존재하는 이메일입니다. 다른 이메일을 사용해주세요.';
        } else if (authError.code === 'auth/invalid-email') {
          errorMessage = '올바른 이메일 형식을 입력해주세요.';
        } else if (authError.code === 'auth/weak-password') {
          errorMessage = '비밀번호가 너무 약합니다.';
        } else {
          errorMessage = `교사 계정 생성 중 오류가 발생했습니다: ${authError.message}`;
        }
        
        await Swal.fire({
          title: '오류',
          text: errorMessage,
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: `교사 계정 생성 중 오류가 발생했습니다: ${error.message}`,
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  const handleUpdateStudent = async () => {
    try {
      if (!studentForm.selectedClassId) {
        await Swal.fire({
          title: '오류',
          text: '클래스를 선택해주세요.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      const selectedClass = classes.find(c => c.id === studentForm.selectedClassId);
      if (!selectedClass) {
        setError('선택된 클래스를 찾을 수 없습니다.');
        return;
      }

      // 이전 클래스에서 학생 제거
      if (editingItem.grade && editingItem.class) {
        const oldClass = classes.find(c => c.grade === editingItem.grade && c.class === editingItem.class);
        if (oldClass && oldClass.students) {
          const updatedStudents = oldClass.students.filter(id => id !== editingItem.id);
          const oldClassRef = doc(db, 'classes', oldClass.id);
          await updateDoc(oldClassRef, {
            students: updatedStudents,
            updatedAt: new Date()
          });
        }
      }

      const studentId = `${selectedClass.grade}${selectedClass.class.toString().padStart(2, '0')}${studentForm.number.toString().padStart(2, '0')}`;
      const studentData = {
        name: studentForm.name,
        grade: selectedClass.grade,
        class: selectedClass.class,
        number: parseInt(studentForm.number),
        birthDate: studentForm.birthDate,
        studentId,
        homeroomTeacher: selectedClass.homeroomTeacher,
        subjectTeachers: selectedClass.subjectTeachers || [],
        updatedAt: new Date()
      };
      
      // 학생 정보 업데이트
      await updateDoc(doc(db, 'accounts', editingItem.id), studentData);
      
      // 새 클래스의 students 배열에 학생 ID 추가
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        students: [...(selectedClass.students || []), editingItem.id],
        updatedAt: new Date()
      });
      
      // 로그 기록 (super_admin은 기록하지 않음)
      if (currentUser.role !== 'super_admin') {
        try {
          await addDoc(collection(db, 'system_logs'), {
            userId: currentUser.uid,
            userName: currentUser.name || currentUser.email,
            userRole: currentUser.role,
            majorCategory: '학생 관리',
            middleCategory: '학생 수정',
            minorCategory: '',
            action: '학생 정보 수정',
            details: `${currentUser.name || currentUser.email}님이 ${studentForm.name} 학생의 정보를 수정했습니다.`,
            timestamp: new Date(),
            createdAt: new Date()
          });
        } catch (logError) {
        // 로그 기록 오류 처리
        }
      }
      
      setShowStudentDialog(false);
      setEditingItem(null);
      setStudentForm({ name: '', grade: '', class: '', number: '', birthDate: '', selectedClassId: '' });
      fetchStudents();
      
      await Swal.fire({
        title: '성공',
        text: '학생 정보가 성공적으로 수정되었습니다!',
        icon: 'success'
      });
    } catch (error) {
      setError('학생 정보 수정 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleAddStudent = async () => {
    try {
      // 필수 필드 검증: 이름, 클래스, 번호, 생년월일
      if (!studentForm.name || !studentForm.selectedClassId || !studentForm.number || !studentForm.birthDate) {
        await Swal.fire({
          title: '오류',
          text: '이름, 클래스, 번호, 생년월일을 모두 입력해주세요.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      const selectedClass = classes.find(c => c.id === studentForm.selectedClassId);
      if (!selectedClass) {
        await Swal.fire({
          title: '오류',
          text: '선택된 클래스를 찾을 수 없습니다.',
          icon: 'error',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        return;
      }

      const studentId = `${selectedClass.grade}${selectedClass.class.toString().padStart(2, '0')}${studentForm.number.toString().padStart(2, '0')}`;
      const studentData = {
        ...studentForm,
        studentId,
        role: 'student',
        status: 'active', // 기본 상태를 active로 설정
        grade: selectedClass.grade,
        class: selectedClass.class,
        homeroomTeacher: selectedClass.homeroomTeacher,
        subjectTeachers: selectedClass.subjectTeachers || [],
        cumulativeScore: 0, // 기본 누적 점수 0으로 설정
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 학생 계정 생성
      const studentRef = await addDoc(collection(db, 'accounts'), studentData);
      
      // 클래스의 students 배열에 학생 ID 추가
      const classRef = doc(db, 'classes', selectedClass.id);
      await updateDoc(classRef, {
        students: [...(selectedClass.students || []), studentRef.id],
        updatedAt: new Date()
      });
      
      // 로그 기록 (super_admin은 기록하지 않음)
      if (currentUser.role !== 'super_admin') {
        try {
          await addDoc(collection(db, 'system_logs'), {
            userId: currentUser.uid,
            userName: currentUser.name || currentUser.email,
            userRole: currentUser.role,
            majorCategory: '학생 관리',
            middleCategory: '학생 생성',
            minorCategory: '',
            action: '학생 추가',
            details: `${currentUser.name || currentUser.email}님이 ${selectedClass.name}에 ${studentForm.name} 학생을 추가했습니다.`,
            timestamp: new Date(),
            createdAt: new Date()
          });
        } catch (logError) {
        // 로그 기록 오류 처리
        }
      }
      
      setShowStudentDialog(false);
      setStudentForm({ name: '', grade: '', class: '', number: '', birthDate: '', selectedClassId: '' });
      fetchStudents();
      
      await Swal.fire({
        title: '성공',
        text: '학생 계정이 성공적으로 생성되었습니다!',
        icon: 'success'
      });
    } catch (error) {
      setError('학생 계정 생성 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 전체 삭제 함수들
  const handleDeleteAllStudents = async () => {
    try {
      const result = await Swal.fire({
        title: '⚠️ 위험한 작업',
        html: `
          <div style="text-align: left;">
            <p><strong>모든 학생 데이터를 삭제하시겠습니까?</strong></p>
            <p style="color: #d32f2f; font-weight: bold;">⚠️ 이 작업은 되돌릴 수 없습니다!</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>모든 학생 계정이 삭제됩니다</li>
              <li>학생들의 상벌점 기록이 삭제됩니다</li>
              <li>관련된 모든 데이터가 영구적으로 삭제됩니다</li>
            </ul>
            <p>계속하려면 아래 입력란에 <strong>"DELETE ALL STUDENTS"</strong>를 입력하세요.</p>
            <input type="text" id="confirmText" class="swal2-input" placeholder="DELETE ALL STUDENTS">
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '삭제 실행',
        cancelButtonText: '취소',
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#6c757d',
        customClass: {
          container: 'swal2-container-high-z'
        },
        preConfirm: () => {
          const confirmText = document.getElementById('confirmText').value;
          if (confirmText !== 'DELETE ALL STUDENTS') {
            Swal.showValidationMessage('정확한 텍스트를 입력해주세요.');
            return false;
          }
          return true;
        }
      });

      if (result.isConfirmed) {
        const startTime = Date.now();
        setLoading(true);
        
        
        // 보안 로그 - 위험한 작업 시도
        await logSecurityAction(
          currentUser,
          LOG_CATEGORIES.SECURITY.middle.SUSPICIOUS_ACTIVITY,
          '전체 학생 삭제 시도',
          '모든 학생 데이터를 삭제하려고 시도함'
        );
        
        // 모든 학생 조회
        const studentsRef = collection(db, 'accounts');
        const studentsQuery = query(studentsRef, where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        if (studentsSnapshot.empty) {
          await logDetailedAction(
            currentUser,
            LOG_CATEGORIES.STUDENT_MANAGEMENT.major,
            LOG_CATEGORIES.STUDENT_MANAGEMENT.middle.DELETE,
            '전체 학생 삭제 시도 - 삭제할 학생 없음',
            '삭제할 학생이 없어서 작업을 중단함',
            { studentCount: 0 }
          );
          
          await Swal.fire({
            title: '알림',
            text: '삭제할 학생이 없습니다.',
            icon: 'info',
            customClass: {
              container: 'swal2-container-high-z'
            }
          });
          setLoading(false);
          return;
        }


        // 배치 삭제 실행
        const batch = writeBatch(db);
        let deleteCount = 0;
        
        studentsSnapshot.forEach((studentDoc) => {
          batch.delete(studentDoc.ref);
          deleteCount++;
        });
        
        await batch.commit();
        
        // 상벌점 기록도 삭제
        const meritRecordsRef = collection(db, 'merit_demerit_records');
        const meritRecordsSnapshot = await getDocs(meritRecordsRef);
        
        let meritDeleteCount = 0;
        if (!meritRecordsSnapshot.empty) {
          const meritBatch = writeBatch(db);
          meritRecordsSnapshot.forEach((recordDoc) => {
            meritBatch.delete(recordDoc.ref);
            meritDeleteCount++;
          });
          await meritBatch.commit();
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 상세한 삭제 완료 로그
        await logDetailedAction(
          currentUser,
          LOG_CATEGORIES.STUDENT_MANAGEMENT.major,
          LOG_CATEGORIES.STUDENT_MANAGEMENT.middle.BULK_DELETE,
          '전체 학생 삭제 완료',
          `학생 ${deleteCount}명, 상벌점 기록 ${meritDeleteCount}건 삭제 완료`,
          {
            studentCount: deleteCount,
            meritRecordCount: meritDeleteCount,
            duration: duration,
            operation: 'bulk_delete_students'
          }
        );
        
        // 성능 로그
        await logPerformance(
          currentUser,
          '전체 학생 삭제',
          duration,
          {
            studentCount: deleteCount,
            meritRecordCount: meritDeleteCount
          }
        );
        
        // 기존 로그도 유지
        await logSystemAction(
          currentUser,
          LOG_CATEGORIES.STUDENT_MANAGEMENT.middle.DELETE,
          '전체 학생 삭제',
          `모든 학생 데이터 삭제 완료 (${deleteCount}명)`
        );

        
        // 데이터 새로고침
        await fetchStudents();
        
        await Swal.fire({
          title: '삭제 완료',
          text: `${deleteCount}명의 학생 데이터가 삭제되었습니다.`,
          icon: 'success',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      setError('학생 전체 삭제 중 오류가 발생했습니다: ' + error.message);
      await Swal.fire({
        title: '오류',
        text: '학생 전체 삭제 중 오류가 발생했습니다.',
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  const handleDeleteAllTeachers = async () => {
    try {
      const result = await Swal.fire({
        title: '⚠️ 위험한 작업',
        html: `
          <div style="text-align: left;">
            <p><strong>모든 교사 데이터를 삭제하시겠습니까?</strong></p>
            <p style="color: #d32f2f; font-weight: bold;">⚠️ 이 작업은 되돌릴 수 없습니다!</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>모든 교사 계정이 삭제됩니다</li>
              <li>담임 교사/교과목 교사 정보가 삭제됩니다</li>
              <li>관련된 모든 데이터가 영구적으로 삭제됩니다</li>
            </ul>
            <p>계속하려면 아래 입력란에 <strong>"DELETE ALL TEACHERS"</strong>를 입력하세요.</p>
            <input type="text" id="confirmText" class="swal2-input" placeholder="DELETE ALL TEACHERS">
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '삭제 실행',
        cancelButtonText: '취소',
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#6c757d',
        customClass: {
          container: 'swal2-container-high-z'
        },
        preConfirm: () => {
          const confirmText = document.getElementById('confirmText').value;
          if (confirmText !== 'DELETE ALL TEACHERS') {
            Swal.showValidationMessage('정확한 텍스트를 입력해주세요.');
            return false;
          }
          return true;
        }
      });

      if (result.isConfirmed) {
        setLoading(true);
        
        // 모든 교사 조회 (super_admin 제외)
        const teachersRef = collection(db, 'accounts');
        const teachersQuery = query(teachersRef, where('role', 'in', ['teacher', 'homeroom_teacher', 'subject_teacher']));
        const teachersSnapshot = await getDocs(teachersQuery);
        
        if (teachersSnapshot.empty) {
          await Swal.fire({
            title: '알림',
            text: '삭제할 교사가 없습니다.',
            icon: 'info',
            customClass: {
              container: 'swal2-container-high-z'
            }
          });
          setLoading(false);
          return;
        }

        // 배치 삭제 실행
        const batch = writeBatch(db);
        let deleteCount = 0;
        
        teachersSnapshot.forEach((teacherDoc) => {
          batch.delete(teacherDoc.ref);
          deleteCount++;
        });
        
        await batch.commit();
        
        // 클래스에서 담임 교사/교과목 교사 정보 초기화
        const classesRef = collection(db, 'classes');
        const classesSnapshot = await getDocs(classesRef);
        
        if (!classesSnapshot.empty) {
          const classBatch = writeBatch(db);
          classesSnapshot.forEach((classDoc) => {
            classBatch.update(classDoc.ref, {
              homeroomTeacher: null,
              homeroomTeacherId: null,
              subjectTeachers: [],
              updatedAt: new Date()
            });
          });
          await classBatch.commit();
        }
        
        // 로그 기록
        await logSystemAction(
          '전체 교사 삭제',
          `모든 교사 데이터 삭제 완료 (${deleteCount}명)`,
          currentUser.uid
        );
        
        // 데이터 새로고침
        await fetchTeachers();
        await fetchClasses();
        
        await Swal.fire({
          title: '삭제 완료',
          text: `${deleteCount}명의 교사 데이터가 삭제되었습니다.`,
          icon: 'success',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      setError('교사 전체 삭제 중 오류가 발생했습니다: ' + error.message);
      await Swal.fire({
        title: '오류',
        text: '교사 전체 삭제 중 오류가 발생했습니다.',
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  const handleDeleteAllMeritRecords = async () => {
    try {
      const result = await Swal.fire({
        title: '⚠️ 위험한 작업',
        html: `
          <div style="text-align: left;">
            <p><strong>모든 상벌점 내역을 삭제하시겠습니까?</strong></p>
            <p style="color: #d32f2f; font-weight: bold;">⚠️ 이 작업은 되돌릴 수 없습니다!</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>모든 학생의 상벌점 기록이 삭제됩니다</li>
              <li>상벌점 요청 내역이 삭제됩니다</li>
              <li>관련된 모든 데이터가 영구적으로 삭제됩니다</li>
            </ul>
            <p>계속하려면 아래 입력란에 <strong>"DELETE ALL MERIT RECORDS"</strong>를 입력하세요.</p>
            <input type="text" id="confirmText" class="swal2-input" placeholder="DELETE ALL MERIT RECORDS">
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '삭제 실행',
        cancelButtonText: '취소',
        confirmButtonColor: '#d32f2f',
        cancelButtonColor: '#6c757d',
        customClass: {
          container: 'swal2-container-high-z'
        },
        preConfirm: () => {
          const confirmText = document.getElementById('confirmText').value;
          if (confirmText !== 'DELETE ALL MERIT RECORDS') {
            Swal.showValidationMessage('정확한 텍스트를 입력해주세요.');
            return false;
          }
          return true;
        }
      });

      if (result.isConfirmed) {
        setLoading(true);
        
        // 모든 상벌점 기록 조회
        const meritRecordsRef = collection(db, 'merit_demerit_records');
        const meritRecordsSnapshot = await getDocs(meritRecordsRef);
        
        if (meritRecordsSnapshot.empty) {
          await Swal.fire({
            title: '알림',
            text: '삭제할 상벌점 내역이 없습니다.',
            icon: 'info',
            customClass: {
              container: 'swal2-container-high-z'
            }
          });
          setLoading(false);
          return;
        }

        // 배치 삭제 실행
        const batch = writeBatch(db);
        let deleteCount = 0;
        
        meritRecordsSnapshot.forEach((recordDoc) => {
          batch.delete(recordDoc.ref);
          deleteCount++;
        });
        
        await batch.commit();
        
        // 로그 기록
        await logSystemAction(
          '전체 상벌점 내역 삭제',
          `모든 상벌점 내역 삭제 완료 (${deleteCount}건)`,
          currentUser.uid
        );
        
        // 데이터 새로고침
        await fetchMeritRecords();
        
        await Swal.fire({
          title: '삭제 완료',
          text: `${deleteCount}건의 상벌점 내역이 삭제되었습니다.`,
          icon: 'success',
          customClass: {
            container: 'swal2-container-high-z'
          }
        });
        
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      setError('상벌점 내역 전체 삭제 중 오류가 발생했습니다: ' + error.message);
      await Swal.fire({
        title: '오류',
        text: '상벌점 내역 전체 삭제 중 오류가 발생했습니다.',
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  // XLSX 다운로드 함수들
  const handleDownloadStudentsXLSX = async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      
      // 로그인 시도 로그
      await logSecurityAction(
        currentUser,
        LOG_CATEGORIES.SECURITY.middle.LOGIN_ATTEMPT,
        '학생 데이터 다운로드 시도',
        'XLSX 파일 생성'
      );
      
      
      // 학생 데이터 조회
      const studentsRef = collection(db, 'accounts');
      const studentsQuery = query(studentsRef, where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));


      // 상벌점 내역 조회
      const meritRecordsRef = collection(db, 'merit_demerit_records');
      const meritRecordsSnapshot = await getDocs(meritRecordsRef);
      
      const meritRecordsData = meritRecordsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));


      // 학생 데이터 워크시트
      const studentsWorksheet = XLSX.utils.json_to_sheet(studentsData.map(student => ({
        '학번': student.studentId || '',
        '이름': student.name || '',
        '학년': student.grade || '',
        '반': student.class || '',
        '번호': student.number || '',
        '생년월일': student.birthDate || '',
        '담임교사': student.homeroomTeacher || '',
        '누적점수': student.cumulativeScore || 0,
        '상태': student.status || 'active',
        '생성일시': student.createdAt ? new Date(student.createdAt.seconds * 1000).toLocaleString() : ''
      })));

      // 상벌점 내역 워크시트
      const meritRecordsWorksheet = XLSX.utils.json_to_sheet(meritRecordsData.map(record => ({
        '학번': record.studentId,
        '학생이름': record.studentName,
        '구분': record.type === 'merit' ? '상점' : '벌점',
        '점수': record.points || record.value || 0,
        '사유': record.reason || '',
        '상세설명': record.description || '',
        '처리교사': record.processedByName || record.creatorName || 'N/A',
        '처리일시': record.createdAt ? record.createdAt.toLocaleString() : '',
        '상태': record.status || 'approved'
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, studentsWorksheet, '학생 데이터');
      XLSX.utils.book_append_sheet(workbook, meritRecordsWorksheet, '상벌점 내역');
      
      XLSX.writeFile(workbook, `students_with_merit_${new Date().toISOString().split('T')[0]}.xlsx`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 성공 로그
      await logDetailedAction(
        currentUser,
        LOG_CATEGORIES.DATA_MANAGEMENT.major,
        LOG_CATEGORIES.DATA_MANAGEMENT.middle.EXPORT,
        '학생 데이터 다운로드 완료',
        `학생 ${studentsData.length}명, 상벌점 기록 ${meritRecordsData.length}건 다운로드 완료`,
        {
          studentCount: studentsData.length,
          meritRecordCount: meritRecordsData.length,
          fileName: `students_with_merit_${new Date().toISOString().split('T')[0]}.xlsx`,
          duration: duration,
          fileSize: 'N/A' // XLSX 파일 크기는 클라이언트에서 측정하기 어려움
        }
      );

      // 성능 로그
      await logPerformance(
        currentUser,
        '학생 데이터 다운로드',
        duration,
        {
          studentCount: studentsData.length,
          meritRecordCount: meritRecordsData.length
        }
      );


      await Swal.fire({
        title: '다운로드 완료',
        text: `학생 데이터 및 상벌점 내역 XLSX 파일이 다운로드되었습니다. (학생: ${studentsData.length}명, 상벌점 기록: ${meritRecordsData.length}건)`,
        icon: 'success',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      
      // 오류 로그
      await logError(
        currentUser,
        error,
        '학생 데이터 XLSX 다운로드',
        {
          operation: 'handleDownloadStudentsXLSX',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      );

      await Swal.fire({
        title: '오류',
        text: '학생 XLSX 다운로드 중 오류가 발생했습니다.',
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  const handleDownloadTeachersXLSX = async () => {
    try {
      const teachersRef = collection(db, 'accounts');
      const teachersQuery = query(teachersRef, where('role', 'in', ['teacher', 'homeroom_teacher', 'subject_teacher', 'super_admin']));
      const teachersSnapshot = await getDocs(teachersQuery);
      
      const teachersData = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const worksheet = XLSX.utils.json_to_sheet(teachersData.map(teacher => ({
        'ID': teacher.id || '',
        '이름': teacher.name || '',
        '이메일': teacher.email || '',
        '역할': teacher.role || '',
        '담당과목': teacher.subject || '',
        '상태': teacher.status || 'active',
        '생성일시': teacher.createdAt ? new Date(teacher.createdAt.seconds * 1000).toLocaleString() : ''
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '교사 데이터');
      
      XLSX.writeFile(workbook, `teachers_${new Date().toISOString().split('T')[0]}.xlsx`);

      await Swal.fire({
        title: '다운로드 완료',
        text: '교사 데이터 XLSX 파일이 다운로드되었습니다.',
        icon: 'success',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '교사 XLSX 다운로드 중 오류가 발생했습니다.',
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  const handleDownloadClassesXLSX = async () => {
    try {
      const classesRef = collection(db, 'classes');
      const classesSnapshot = await getDocs(classesRef);
      
      const classesData = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const worksheet = XLSX.utils.json_to_sheet(classesData.map(cls => ({
        'ID': cls.id || '',
        '클래스명': cls.name || '',
        '학년': cls.grade || '',
        '반': cls.class || '',
        '담임교사': cls.homeroomTeacher || '',
        '교과목교사': (cls.subjectTeachers || []).join(';'),
        '학생수': (cls.students || []).length,
        '생성일시': cls.createdAt ? new Date(cls.createdAt.seconds * 1000).toLocaleString() : ''
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '클래스 데이터');
      
      XLSX.writeFile(workbook, `classes_${new Date().toISOString().split('T')[0]}.xlsx`);

      await Swal.fire({
        title: '다운로드 완료',
        text: '클래스 데이터 XLSX 파일이 다운로드되었습니다.',
        icon: 'success',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '클래스 XLSX 다운로드 중 오류가 발생했습니다.',
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };

  // 전체 데이터 다운로드
  const handleDownloadAllDataXLSX = async () => {
    try {
      setLoading(true);
      
      // 모든 데이터 조회
      const [studentsSnapshot, teachersSnapshot, classesSnapshot, meritRecordsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'accounts'), where('role', '==', 'student'))),
        getDocs(query(collection(db, 'accounts'), where('role', 'in', ['teacher', 'homeroom_teacher', 'subject_teacher', 'super_admin']))),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'merit_demerit_records'))
      ]);
      
      const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const teachersData = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const meritRecordsData = meritRecordsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));

      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      
      // 학생 데이터 시트
      const studentsWorksheet = XLSX.utils.json_to_sheet(studentsData.map(student => ({
        '학번': student.studentId || '',
        '이름': student.name || '',
        '학년': student.grade || '',
        '반': student.class || '',
        '번호': student.number || '',
        '생년월일': student.birthDate || '',
        '담임교사': student.homeroomTeacher || '',
        '누적점수': student.cumulativeScore || 0,
        '상태': student.status || 'active',
        '생성일시': student.createdAt ? new Date(student.createdAt.seconds * 1000).toLocaleString() : ''
      })));
      XLSX.utils.book_append_sheet(workbook, studentsWorksheet, '학생 데이터');
      
      // 교사 데이터 시트
      const teachersWorksheet = XLSX.utils.json_to_sheet(teachersData.map(teacher => ({
        'ID': teacher.id || '',
        '이름': teacher.name || '',
        '이메일': teacher.email || '',
        '역할': teacher.role || '',
        '담당과목': teacher.subject || '',
        '상태': teacher.status || 'active',
        '생성일시': teacher.createdAt ? new Date(teacher.createdAt.seconds * 1000).toLocaleString() : ''
      })));
      XLSX.utils.book_append_sheet(workbook, teachersWorksheet, '교사 데이터');
      
      // 클래스 데이터 시트
      const classesWorksheet = XLSX.utils.json_to_sheet(classesData.map(cls => ({
        'ID': cls.id || '',
        '클래스명': cls.name || '',
        '학년': cls.grade || '',
        '반': cls.class || '',
        '담임교사': cls.homeroomTeacher || '',
        '교과목교사': (cls.subjectTeachers || []).join(';'),
        '학생수': (cls.students || []).length,
        '생성일시': cls.createdAt ? new Date(cls.createdAt.seconds * 1000).toLocaleString() : ''
      })));
      XLSX.utils.book_append_sheet(workbook, classesWorksheet, '클래스 데이터');
      
      // 상벌점 내역 시트
      const meritRecordsWorksheet = XLSX.utils.json_to_sheet(meritRecordsData.map(record => ({
        '학번': record.studentId,
        '학생이름': record.studentName,
        '구분': record.type === 'merit' ? '상점' : '벌점',
        '점수': record.points || record.value || 0,
        '사유': record.reason || '',
        '상세설명': record.description || '',
        '처리교사': record.processedByName || record.creatorName || 'N/A',
        '처리일시': record.createdAt ? record.createdAt.toLocaleString() : '',
        '상태': record.status || 'approved'
      })));
      XLSX.utils.book_append_sheet(workbook, meritRecordsWorksheet, '상벌점 내역');
      
      XLSX.writeFile(workbook, `all_data_${new Date().toISOString().split('T')[0]}.xlsx`);

      await Swal.fire({
        title: '다운로드 완료',
        text: `전체 데이터 XLSX 파일이 다운로드되었습니다. (학생: ${studentsData.length}명, 교사: ${teachersData.length}명, 클래스: ${classesData.length}개, 상벌점 기록: ${meritRecordsData.length}건)`,
        icon: 'success',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      await Swal.fire({
        title: '오류',
        text: '전체 데이터 XLSX 다운로드 중 오류가 발생했습니다.',
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        }
      });
    }
  };


  // XLSX 업로드 함수 (상벌점 내역 포함)
  const handleXLSXUpload = async (file) => {
    if (!file) return;
    
    const startTime = Date.now();
    try {
      // 업로드 시도 로그
      await logSecurityAction(
        currentUser,
        LOG_CATEGORIES.SECURITY.middle.LOGIN_ATTEMPT,
        'XLSX 파일 업로드 시도',
        `파일명: ${file.name}, 크기: ${file.size} bytes`
      );


      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 모든 시트 확인
          const sheetNames = workbook.SheetNames;
          
          // 학생 데이터 시트 찾기
          const studentsSheetName = sheetNames.find(name => 
            name.includes('학생') || name.includes('student') || name === 'Sheet1'
          ) || sheetNames[0];
          
          const studentsWorksheet = workbook.Sheets[studentsSheetName];
          const studentsData = XLSX.utils.sheet_to_json(studentsWorksheet);
          
          // 상벌점 내역 시트 찾기
          const meritSheetName = sheetNames.find(name => 
            name.includes('상벌점') || name.includes('merit') || name.includes('내역')
          );
          
          let meritRecordsData = [];
          if (meritSheetName) {
            const meritWorksheet = workbook.Sheets[meritSheetName];
            meritRecordsData = XLSX.utils.sheet_to_json(meritWorksheet);
          }
          
          if (studentsData.length === 0) {
            await Swal.fire({
              title: '오류',
              text: '학생 데이터가 없습니다.',
              icon: 'error',
              customClass: {
                container: 'swal2-container-high-z'
              }
            });
            return;
          }

          // 기존 데이터 삭제 확인
          const confirmResult = await Swal.fire({
            title: '데이터 덮어쓰기',
            html: `
              <div style="text-align: left;">
                <p><strong>⚠️ 경고: 이 작업은 기존 데이터를 모두 삭제합니다!</strong></p>
                <p>다음 데이터가 삭제됩니다:</p>
                <ul>
                  <li>모든 학생 계정</li>
                  <li>모든 상벌점 기록</li>
                  <li>모든 클래스 데이터</li>
                </ul>
                <p>업로드할 데이터:</p>
                <ul>
                  <li>학생: ${studentsData.length}명</li>
                  <li>상벌점 기록: ${meritRecordsData.length}건</li>
                </ul>
              </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: '데이터 덮어쓰기',
            cancelButtonText: '취소',
            customClass: {
              container: 'swal2-container-high-z'
            }
          });

          if (!confirmResult.isConfirmed) {
            return;
          }

          // 진행 상황 표시를 위한 SweetAlert
          const totalItems = studentsData.length + meritRecordsData.length;
          let progressSwal = null;
          if (totalItems > 5) {
            progressSwal = Swal.fire({
              title: '데이터 처리 중...',
              html: `
                <div style="text-align: center;">
                  <div style="margin: 20px 0;">
                    <div class="swal2-progress-bar" style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                      <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); transition: width 0.3s ease;"></div>
                    </div>
                    <div id="progress-text" style="margin-top: 10px; font-weight: bold;">처리 중... (0/${totalItems})</div>
                  </div>
                </div>
              `,
              allowOutsideClick: false,
              allowEscapeKey: false,
              showConfirmButton: false,
              customClass: {
                container: 'swal2-container-high-z'
              }
            });
          }

          // 1. 기존 데이터 삭제
          
          // 모든 학생 계정 삭제
          const studentsSnapshot = await getDocs(query(collection(db, 'accounts'), where('role', '==', 'student')));
          const studentsBatch = writeBatch(db);
          studentsSnapshot.docs.forEach(doc => {
            studentsBatch.delete(doc.ref);
          });
          await studentsBatch.commit();
          
          // 모든 상벌점 기록 삭제
          const meritRecordsSnapshot = await getDocs(collection(db, 'merit_demerit_records'));
          const meritBatch = writeBatch(db);
          meritRecordsSnapshot.docs.forEach(doc => {
            meritBatch.delete(doc.ref);
          });
          await meritBatch.commit();
          
          // 모든 클래스 데이터 삭제
          const classesSnapshot = await getDocs(collection(db, 'classes'));
          const classesBatch = writeBatch(db);
          classesSnapshot.docs.forEach(doc => {
            classesBatch.delete(doc.ref);
          });
          await classesBatch.commit();
          

          // 2. 새 데이터 업로드
          let processedCount = 0;
          let successCount = 0;
          let errorCount = 0;
          const errors = [];
          
          // 학생 데이터 처리
          for (let i = 0; i < studentsData.length; i++) {
            const student = studentsData[i];
            try {
              // 진행 상황 업데이트
              processedCount++;
              if (progressSwal) {
                const progress = (processedCount / totalItems) * 100;
                const progressBar = document.getElementById('progress-bar');
                const progressText = document.getElementById('progress-text');
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `학생 처리 중... (${processedCount}/${totalItems})`;
              }
              
              // 새로운 Excel 형식에 맞춰 필드 매핑
              const className = student['클래스명'] || student['클래스'];
              const grade = student['학년'];
              const classNumber = student['반'];
              const studentNumber = student['번호'];
              const birthDate = student['생년월일'];
              const name = student['이름'];
              
              // 필수 필드 확인
              const missingFields = [];
              if (!name) missingFields.push('이름');
              if (!className) missingFields.push('클래스명');
              if (!grade) missingFields.push('학년');
              if (!classNumber) missingFields.push('반');
              if (!studentNumber) missingFields.push('번호');
              
              if (missingFields.length > 0) {
                errors.push(`행 ${studentsData.indexOf(student) + 2}: 필수 필드 누락 (${missingFields.join(', ')}) - ${name || '이름 없음'}`);
                errorCount++;
                continue;
              }
              
              // 데이터 타입 검증
              const gradeNum = parseInt(grade);
              const classNum = parseInt(classNumber);
              const studentNum = parseInt(studentNumber);
              
              if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
                errors.push(`행 ${studentsData.indexOf(student) + 2}: 학년이 올바르지 않습니다 (${grade}) - ${name}`);
                errorCount++;
                continue;
              }
              
              if (isNaN(classNum) || classNum < 1 || classNum > 20) {
                errors.push(`행 ${studentsData.indexOf(student) + 2}: 반이 올바르지 않습니다 (${classNumber}) - ${name}`);
                errorCount++;
                continue;
              }
              
              if (isNaN(studentNum) || studentNum < 1 || studentNum > 500) {
                errors.push(`행 ${i + 2}: 번호가 올바르지 않습니다 (${studentNumber}) - ${name}`);
                errorCount++;
                continue;
              }
              
              // 중복 학생 검사 (이름, 생년월일, 학년, 반, 번호)
              const isDuplicate = students.some(existingStudent => 
                existingStudent.name === name &&
                existingStudent.birthDate === (birthDate || '') &&
                existingStudent.grade === gradeNum &&
                existingStudent.class === classNum &&
                existingStudent.number === studentNum
              );
              
              if (isDuplicate) {
                errors.push(`행 ${i + 2}: ${name} - 중복된 학생입니다 (이름: ${name}, 생년월일: ${birthDate || '없음'}, ${gradeNum}학년 ${classNum}반 ${studentNum}번)`);
                errorCount++;
                continue;
              }
              
              // 학번 생성 (학년 + 반 + 번호)
              const studentId = `${gradeNum}${classNum.toString().padStart(2, '0')}${studentNum.toString().padStart(2, '0')}`;
              
              // 클래스 ID 찾기 또는 생성
              let classId = null;
              let homeroomTeacherId = '';
              let homeroomTeacher = '';
              
              const existingClass = classes.find(c => c.name === className);
              if (existingClass) {
                classId = existingClass.id;
                homeroomTeacherId = existingClass.homeroomTeacherId || '';
                homeroomTeacher = existingClass.homeroomTeacher || '';
              } else {
                // 새 클래스 생성
                const classRef = doc(collection(db, 'classes'));
                batch.set(classRef, {
                  name: className,
                  grade: gradeNum,
                  classNumber: classNum,
                  homeroomTeacherId: '',
                  homeroomTeacher: '',
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                classId = classRef.id;
              }
              
              const studentRef = doc(collection(db, 'accounts'));
              batch.set(studentRef, {
                name: name,
                studentId: studentId,
                grade: gradeNum,
                class: classNum,
                number: studentNum,
                birthDate: birthDate || '',
                homeroomTeacher: homeroomTeacher,
                homeroomTeacherId: homeroomTeacherId,
                role: 'student',
                status: 'active',
                cumulativeScore: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              // 클래스의 students 배열에 학생 ID 추가
              const classRef = doc(db, 'classes', classId);
              const classDoc = await getDoc(classRef);
              if (classDoc.exists()) {
                const classData = classDoc.data();
                const currentStudents = classData.students || [];
                if (!currentStudents.includes(studentRef.id)) {
                  batch.update(classRef, {
                    students: [...currentStudents, studentRef.id],
                    updatedAt: new Date()
                  });
                }
              }
              
              successCount++;
            } catch (error) {
              errors.push(`행 ${i + 2}: ${student['이름'] || '이름 없음'} - ${error.message}`);
              errorCount++;
            }
          }
          
          // 상벌점 내역 처리
          if (meritRecordsData.length > 0) {
            
            for (let i = 0; i < meritRecordsData.length; i++) {
              const record = meritRecordsData[i];
              try {
                // 진행 상황 업데이트
                processedCount++;
                if (progressSwal) {
                  const progress = (processedCount / totalItems) * 100;
                  const progressBar = document.getElementById('progress-bar');
                  const progressText = document.getElementById('progress-text');
                  if (progressBar) progressBar.style.width = `${progress}%`;
                  if (progressText) progressText.textContent = `상벌점 내역 처리 중... (${processedCount}/${totalItems})`;
                }
                
                // 필수 필드 확인
                const studentId = record['학번'];
                const studentName = record['학생이름'];
                const type = record['구분'] === '상점' ? 'merit' : 'demerit';
                const points = parseInt(record['점수']) || 0;
                const reason = record['사유'] || '';
                const description = record['상세설명'] || '';
                const processedTeacher = record['처리교사'] || 'N/A';
                const processedDate = record['처리일시'] || new Date().toLocaleString();
                
                if (!studentId || !studentName) {
                  errors.push(`상벌점 기록 ${i + 1}: 학번 또는 학생이름이 없습니다`);
                  errorCount++;
                  continue;
                }
                
                // 상벌점 기록 생성
                const meritRecordRef = doc(collection(db, 'merit_demerit_records'));
                batch.set(meritRecordRef, {
                  studentId: studentId,
                  studentName: studentName,
                  type: type,
                  points: type === 'demerit' ? -Math.abs(points) : Math.abs(points),
                  value: type === 'demerit' ? -Math.abs(points) : Math.abs(points),
                  reason: reason,
                  description: description,
                  processedByName: processedTeacher,
                  creatorName: processedTeacher,
                  creatorRole: 'admin',
                  status: 'approved',
                  createdAt: new Date(processedDate) || new Date(),
                  updatedAt: new Date()
                });
                
                successCount++;
              } catch (error) {
                errors.push(`상벌점 기록 ${i + 1}: ${error.message}`);
                errorCount++;
              }
            }
          }
          
          // 진행 상황 창 닫기
          if (progressSwal) {
            await Swal.close();
          }
          
          await batch.commit();
          
          // 데이터 새로고침
          await fetchStudents();
          await fetchTeachers();
          await fetchClasses();
          await fetchResetRequests();
          
          const endTime = Date.now();
          const duration = endTime - startTime;

          // 상세한 업로드 완료 로그
          await logDetailedAction(
            currentUser,
            LOG_CATEGORIES.DATA_MANAGEMENT.major,
            LOG_CATEGORIES.DATA_MANAGEMENT.middle.OVERWRITE,
            'XLSX 파일 업로드 및 데이터 덮어쓰기 완료',
            `학생 ${successCount}명, 상벌점 기록 ${meritRecordsData.length}건 처리 완료 (오류: ${errorCount}건)`,
            {
              fileName: file.name,
              fileSize: file.size,
              studentCount: successCount,
              meritRecordCount: meritRecordsData.length,
              errorCount: errorCount,
              duration: duration,
              errors: errors.slice(0, 10), // 처음 10개 오류만 저장
              totalErrors: errors.length
            }
          );

          // 성능 로그
          await logPerformance(
            currentUser,
            'XLSX 파일 업로드 및 데이터 처리',
            duration,
            {
              studentCount: successCount,
              meritRecordCount: meritRecordsData.length,
              errorCount: errorCount
            }
          );

          // 기존 로그도 유지
          await logSystemAction(
            currentUser,
            LOG_CATEGORIES.STUDENT_MANAGEMENT.middle.CREATE,
            '학생 일괄 생성',
            `${successCount}명의 학생이 일괄 생성되었습니다. (오류: ${errorCount}건)`
          );

          
          let message = `${successCount}명의 학생이 추가되었습니다.`;
          if (errorCount > 0) {
            message += `\n\n오류가 발생한 항목: ${errorCount}건`;
            if (errors.length > 0) {
              message += `\n\n오류 상세:\n${errors.slice(0, 10).join('\n')}`;
              if (errors.length > 10) {
                message += `\n... 외 ${errors.length - 10}건`;
              }
            }
          }
          
          // 오류가 많으면 더 자세한 정보를 표시
          if (errorCount > 0) {
            await Swal.fire({
              title: errorCount > 0 ? '부분 성공' : '성공',
              html: `
                <div style="text-align: left;">
                  <p><strong>성공:</strong> ${successCount}명</p>
                  <p><strong>실패:</strong> ${errorCount}건</p>
                  ${errors.length > 0 ? `
                    <details style="margin-top: 10px;">
                      <summary style="cursor: pointer; font-weight: bold;">실패 상세 내역 (클릭하여 펼치기)</summary>
                      <div style="margin-top: 10px; max-height: 300px; overflow-y: auto; background: #f5f5f5; padding: 10px; border-radius: 5px;">
                        ${errors.map(error => `<div style="margin-bottom: 5px; font-size: 12px;">• ${error}</div>`).join('')}
                      </div>
                    </details>
                  ` : ''}
                </div>
              `,
              icon: errorCount > 0 ? 'warning' : 'success',
              customClass: {
                container: 'swal2-container-high-z'
              },
              width: '600px'
            });
          } else {
            await Swal.fire({
              title: '성공',
              text: message,
              icon: 'success',
              customClass: {
                container: 'swal2-container-high-z'
              }
            });
          }
        } catch (error) {
          await Swal.fire({
            title: 'XLSX 파일 처리 오류',
            html: `
              <div style="text-align: left;">
                <p><strong>오류 유형:</strong> ${error.name || '알 수 없는 오류'}</p>
                <p><strong>오류 메시지:</strong> ${error.message || '오류 메시지가 없습니다'}</p>
                <details style="margin-top: 10px;">
                  <summary style="cursor: pointer; font-weight: bold;">상세 오류 정보 (클릭하여 펼치기)</summary>
                  <div style="margin-top: 10px; background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; word-wrap: break-word; white-space: pre-wrap; overflow-wrap: break-word; max-width: 100%;">
                    <pre style="white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; margin: 0; padding: 0;">${error.stack || '스택 트레이스가 없습니다'}</pre>
                  </div>
                </details>
              </div>
            `,
            icon: 'error',
            customClass: {
              container: 'swal2-container-high-z'
            },
            width: '600px'
          });
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      await Swal.fire({
        title: 'XLSX 파일 업로드 오류',
        html: `
          <div style="text-align: left;">
            <p><strong>오류 유형:</strong> ${error.name || '알 수 없는 오류'}</p>
            <p><strong>오류 메시지:</strong> ${error.message || '오류 메시지가 없습니다'}</p>
            <details style="margin-top: 10px;">
              <summary style="cursor: pointer; font-weight: bold;">상세 오류 정보 (클릭하여 펼치기)</summary>
              <div style="margin-top: 10px; background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; word-wrap: break-word; white-space: pre-wrap; overflow-wrap: break-word; max-width: 100%;">
                <pre style="white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; margin: 0; padding: 0;">${error.stack || '스택 트레이스가 없습니다'}</pre>
              </div>
            </details>
          </div>
        `,
        icon: 'error',
        customClass: {
          container: 'swal2-container-high-z'
        },
        width: '600px'
      });
    }
  };


  const handleViewClassDetails = (cls) => {
    setSelectedClass(cls);
    setShowClassDetailsDialog(true);
  };

  const handleEdit = async (item, type) => {
    if (type === 'class') {
      // 활성화된 교사만 선택할 수 있도록 필터링
      const activeHomeroomTeacher = item.homeroomTeacher && 
        teachers.find(t => t.id === item.homeroomTeacher && t.status !== 'disabled') 
        ? item.homeroomTeacher : '';
      
      const activeSubjectTeachers = (item.subjectTeachers || []).filter(teacherId => 
        teachers.find(t => t.id === teacherId && t.status !== 'disabled')
      );
      
      setClassForm({
        grade: item.grade,
        class: item.class,
        name: item.name, // 클래스명 추가
        homeroomTeacher: activeHomeroomTeacher,
        subjectTeachers: activeSubjectTeachers
      });
      setEditingItem({ ...item, type });
      setShowClassDialog(true);
    } else if (type === 'teacher') {
      setTeacherForm({
        name: item.name,
        email: item.email,
        role: item.role,
        phone: item.phone || '',
        subject: item.subject || ''
      });
      setEditingItem({ ...item, type });
      setShowTeacherDialog(true);
    } else if (type === 'student') {
      // 학생의 현재 클래스 찾기
      const currentClass = classes.find(cls => 
        cls.grade === item.grade && cls.class === item.class
      );
      
      setStudentForm({
        name: item.name,
        grade: item.grade,
        class: item.class,
        number: item.number,
        birthDate: item.birthDate,
        selectedClassId: currentClass?.id || ''
      });
      setEditingItem({ ...item, type });
      setShowStudentDialog(true);
    }
  };

  const handleDelete = async (item, type) => {
    let confirmMessage = `정말로 이 ${type === 'class' ? '클래스' : type === 'teacher' ? '교사' : '학생'}를 삭제하시겠습니까?`;
    
    if (type === 'class') {
      const classStudents = students.filter(s => s.grade === item.grade && s.class === item.class);
      if (classStudents.length > 0) {
        confirmMessage = `⚠️ 경고: 이 클래스를 삭제하면 ${classStudents.length}명의 학생도 함께 삭제됩니다!\n\n정말로 삭제하시겠습니까?`;
      }
    }
    
    const result = await Swal.fire({
      title: '삭제 확인',
      text: confirmMessage,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '삭제',
      cancelButtonText: '취소'
    });
    
    if (!result.isConfirmed) {
      return;
    }

    try {
      if (type === 'class') {
        // 클래스 삭제 시 해당 클래스의 학생들도 함께 삭제
        const classStudents = students.filter(s => s.grade === item.grade && s.class === item.class);
        const batch = writeBatch(db);
        
        // 클래스 삭제
        batch.delete(doc(db, 'classes', item.id));
        
        // 해당 클래스의 학생들 삭제
        for (const student of classStudents) {
          batch.delete(doc(db, 'accounts', student.id));
        }
        
        await batch.commit();
        
        // 로그 기록
        await logClassAction(
          currentUser, 
          LOG_CATEGORIES.CLASS_MANAGEMENT.middle.DELETE, 
          `클래스 "${item.name}" 삭제 (학생 ${classStudents.length}명 포함)`
        );
        
        await Swal.fire({
          title: '삭제 완료',
          text: `클래스와 ${classStudents.length}명의 학생이 성공적으로 삭제되었습니다.`,
          icon: 'success'
        });
      } else {
        // 교사나 학생 삭제
        let collectionName = '';
        if (type === 'teacher') {
          collectionName = 'accounts';
          
          // 교사 삭제 시 계정 비활성화 처리
          try {
            
            // Firestore에서 사용자 정보를 비활성화 상태로 업데이트
            const userRef = doc(db, 'accounts', item.id);
            await updateDoc(userRef, {
              status: 'deleted',
              deletedAt: new Date(),
              deletedBy: currentUser.uid,
              deletedByEmail: currentUser.email
            });
            
          } catch (updateError) {
            // 비활성화 실패 시에도 Firestore 삭제는 계속 진행
          }
        } else if (type === 'student') {
          collectionName = 'accounts';
        }
        
        // 교사/학생 삭제 시 관련 데이터도 함께 삭제
        if (type === 'teacher') {
          const batch = writeBatch(db);
          
          // 1. 교사가 보낸 상벌점 요청 삭제
          const requestsRef = collection(db, 'merit_demerit_requests');
          const requestsQuery = query(requestsRef, where('requestingTeacherId', '==', item.id));
          const requestsSnapshot = await getDocs(requestsQuery);
          requestsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          // 2. 교사가 처리한 상벌점 로그 삭제
          const logsRef = collection(db, 'merit_demerit_records');
          const logsQuery = query(logsRef, where('teacherId', '==', item.id));
          const logsSnapshot = await getDocs(logsQuery);
          logsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          // 3. 교사가 담당하는 클래스에서 제거
          const classesRef = collection(db, 'classes');
          const classesQuery = query(classesRef, where('homeroomTeacherId', '==', item.id));
          const classesSnapshot = await getDocs(classesQuery);
          classesSnapshot.forEach((doc) => {
            batch.update(doc.ref, { homeroomTeacherId: null });
          });
          
          // 4. 교사가 담당하는 클래스에서 제거 (교과목 교사)
          const subjectClassesQuery = query(classesRef, where('subjectTeachers', 'array-contains', item.id));
          const subjectClassesSnapshot = await getDocs(subjectClassesQuery);
          subjectClassesSnapshot.forEach((doc) => {
            const classData = doc.data();
            const updatedSubjectTeachers = classData.subjectTeachers.filter(id => id !== item.id);
            batch.update(doc.ref, { subjectTeachers: updatedSubjectTeachers });
          });
          
          // 5. 교사 계정 삭제
          batch.delete(doc(db, collectionName, item.id));
          
          // 6. 초기화 요청에서 제거
          const resetRequestsRef = collection(db, 'reset_requests');
          const resetQuery = query(resetRequestsRef, where('teacherId', '==', item.id));
          const resetSnapshot = await getDocs(resetQuery);
          resetSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          
          await logUserAction(
            currentUser, 
            LOG_CATEGORIES.USER_MANAGEMENT.middle.TEACHER, 
            `교사 "${item.name}" 삭제 (관련 데이터 포함)`
          );
        } else if (type === 'student') {
          const batch = writeBatch(db);
          
          // 1. 학생의 상벌점 요청 삭제
          const requestsRef = collection(db, 'merit_demerit_requests');
          const requestsQuery = query(requestsRef, where('studentId', '==', item.id));
          const requestsSnapshot = await getDocs(requestsQuery);
          requestsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          // 2. 학생의 상벌점 로그 삭제
          const logsRef = collection(db, 'merit_demerit_records');
          const logsQuery = query(logsRef, where('studentId', '==', item.id));
          const logsSnapshot = await getDocs(logsQuery);
          logsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          // 3. 학생 계정 삭제
          batch.delete(doc(db, collectionName, item.id));
          
          await batch.commit();
          
          await logStudentAction(
            currentUser, 
            LOG_CATEGORIES.STUDENT_MANAGEMENT.middle.DELETE, 
            `학생 "${item.name}" 삭제 (관련 데이터 포함)`
          );
        } else {
          // 클래스 삭제는 기존 로직 유지
          await deleteDoc(doc(db, collectionName, item.id));
        }
        
        await Swal.fire({
          title: '삭제 완료',
          text: `${type === 'teacher' ? '교사 계정이 비활성화되었습니다. (Firebase Auth 계정은 유지되지만 로그인이 차단됩니다)' : '학생이 성공적으로 삭제되었습니다.'}`,
          icon: 'success'
        });
      }
      
      fetchData();
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '삭제 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
  };



  // 초기화 동의 현황 조회
  const fetchResetRequests = async () => {
    try {
      const requestsRef = collection(db, 'reset_requests');
      const q = query(requestsRef, orderBy('requestedAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate?.() || new Date(doc.data().requestedAt),
          expiresAt: doc.data().expiresAt?.toDate?.() || new Date(doc.data().expiresAt)
        }));
        setResetRequests(requestsData);
      }, (error) => {
        // 초기화 요청 조회 오류 처리
      });
      
      return unsubscribe;
    } catch (error) {
      // 초기화 요청 조회 오류 처리
    }
  };

  // 초기화 활성화 가능 여부 확인
  const canPerformFinalReset = () => {
    const homeroomTeachers = teachers.filter(t => t.role === 'homeroom_teacher');
    const approvedRequests = resetRequests.filter(r => r.status === 'approved');
    return homeroomTeachers.length > 0 && approvedRequests.length === homeroomTeachers.length;
  };

  const checkResetApprovalStatus = async () => {
    const homeroomTeachers = teachers.filter(t => t.role === 'homeroom_teacher');
    const approvedRequests = resetRequests.filter(r => r.status === 'approved');
    const pendingRequests = resetRequests.filter(r => r.status === 'pending');
    const rejectedRequests = resetRequests.filter(r => r.status === 'rejected');

    // 거절된 요청이 있으면 초기화 요청을 리셋
    if (rejectedRequests.length > 0) {
      try {
        // 모든 초기화 요청 삭제
        const batch = writeBatch(db);
        resetRequests.forEach(request => {
          batch.delete(doc(db, 'reset_requests', request.id));
        });
        await batch.commit();

        // 시스템 로그 기록
        await logSystemAction(
          currentUser,
          LOG_CATEGORIES.SYSTEM.middle.RESET,
          '초기화 요청 리셋',
          '담임 교사가 초기화를 거절하여 모든 초기화 요청이 리셋되었습니다.'
        );

        await Swal.fire({
          title: '초기화 요청 리셋',
          text: '담임 교사가 초기화를 거절했습니다. 모든 초기화 요청이 리셋되었습니다.',
          icon: 'info',
          confirmButtonText: '확인'
        });

        return;
      } catch (error) {
      }
    }

    let statusMessage = `담임 교사 총 ${homeroomTeachers.length}명 중:\n`;
    statusMessage += `✅ 동의: ${approvedRequests.length}명\n`;
    statusMessage += `⏳ 대기: ${pendingRequests.length}명\n`;
    statusMessage += `❌ 거부: ${rejectedRequests.length}명\n\n`;

    if (approvedRequests.length === homeroomTeachers.length) {
      statusMessage += '🎉 모든 담임 교사의 동의를 받았습니다!';
    } else if (rejectedRequests.length > 0) {
      statusMessage += '⚠️ 일부 담임 교사가 거부했습니다.';
    } else {
      statusMessage += '⏳ 아직 모든 담임 교사의 동의를 기다리는 중입니다.';
    }

    await Swal.fire({
      title: '초기화 동의 현황',
      text: statusMessage,
      icon: approvedRequests.length === homeroomTeachers.length ? 'success' : 'info',
      confirmButtonText: '확인'
    });
  };

  const handleClassDetails = async (cls) => {
    try {
      setSelectedClass(cls);
      
      let homeroomTeacher = null;
      if (cls.homeroomTeacherId || cls.homeroomTeacher) {
        const teacherId = cls.homeroomTeacherId || cls.homeroomTeacher;
        const teacherDoc = await getDoc(doc(db, 'accounts', teacherId));
        if (teacherDoc.exists()) {
          homeroomTeacher = { id: teacherDoc.id, ...teacherDoc.data() };
        }
      }
      
      const subjectTeachers = [];
      if (cls.subjectTeachers && cls.subjectTeachers.length > 0) {
        for (const teacherId of cls.subjectTeachers) {
          const teacherDoc = await getDoc(doc(db, 'accounts', teacherId));
          if (teacherDoc.exists()) {
            subjectTeachers.push({ id: teacherDoc.id, ...teacherDoc.data() });
          }
        }
      }
      
      let students = [];
      if (cls.grade && cls.class) {
        const studentsRef = collection(db, 'accounts');
        const studentsQuery = query(
          studentsRef,
          where('role', '==', 'student'),
          where('grade', '==', cls.grade),
          where('class', '==', cls.class)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        students = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      setClassDetails({
        homeroomTeacher,
        subjectTeachers,
        students
      });
      
      setShowClassDetailsDialog(true);
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '클래스 상세 정보를 가져오는 중 오류가 발생했습니다.',
        icon: 'error'
      });
    }
  };

  // 학생 클릭 핸들러 (상벌점 이력 조회)
  const handleStudentClick = async (student) => {
    try {
      setSelectedStudentForHistory(student);
      await fetchStudentMeritHistory(student.id);
      setShowStudentMeritHistoryDialog(true);
    } catch (error) {
      setError('학생 상벌점 이력을 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleViewStudentLogs = async (student) => {
    try {
      const logsRef = collection(db, 'merit_demerit_records');
      const logsQuery = query(logsRef, where('studentId', '==', student.id));
      const logsSnapshot = await getDocs(logsQuery);
      
      const logs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let logsHtml = '';
      if (logs.length > 0) {
        logs.forEach((log, index) => {
          logsHtml += `
            <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
              <strong>${index + 1}. ${log.type === 'merit' ? '상점' : '벌점'} ${log.value}점</strong><br>
              <strong>사유:</strong> ${log.reason}<br>
              <strong>상세 내용:</strong> ${log.description || '-'}<br>
              <strong>처리 교사:</strong> ${log.teacherName || log.teacherId}<br>
              <strong>처리 일시:</strong> ${log.createdAt?.toDate?.()?.toLocaleDateString() || '날짜 없음'}
            </div>
          `;
        });
      } else {
        logsHtml = '<p>상벌점 로그가 없습니다.</p>';
      }

      await Swal.fire({
        title: `${student.name} 학생의 상벌점 로그`,
        html: logsHtml,
        width: '600px',
        confirmButtonText: '닫기'
      });
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '학생 로그를 조회하는 중 오류가 발생했습니다.',
        icon: 'error'
      });
    }
  };



  // CSV 덮어쓰기 처리
  const handleCSVOverwrite = async (file) => {
    if (!file) return;
    
    if (!window.confirm('⚠️ 경고: 이 작업은 되돌릴 수 없습니다!\n\n정말로 현재 데이터를 모두 삭제하고 CSV 파일의 내용으로 덮어쓰시겠습니까?\n\n- 모든 기존 데이터가 삭제됩니다\n- CSV 파일의 내용으로 새로 생성됩니다')) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        
        // CSV 형식 검증
        if (lines.length < 2) {
          alert('CSV 파일이 비어있거나 형식이 올바르지 않습니다.');
          return;
        }
        
        // 기존 데이터 삭제
        const batch = writeBatch(db);
        
        // 클래스 삭제
        const classesRef = collection(db, 'classes');
        const classesSnapshot = await getDocs(classesRef);
        classesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // 교사 계정 삭제 (최고 관리자 제외)
        const teachersRef = collection(db, 'accounts');
        const teachersSnapshot = await getDocs(query(teachersRef, where('role', '==', 'teacher')));
        teachersSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // 학생 계정 삭제
        const studentsRef = collection(db, 'accounts');
        const studentsSnapshot = await getDocs(query(studentsRef, where('role', '==', 'student')));
        studentsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // 상벌점 기록 삭제
        const recordsRef = collection(db, 'merit_demerit_records');
        const recordsSnapshot = await getDocs(recordsRef);
        recordsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // 초기화 요청 삭제
        const resetRequestsRef = collection(db, 'reset_requests');
        const resetRequestsSnapshot = await getDocs(resetRequestsRef);
        resetRequestsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // CSV 파일 파싱 및 새 데이터 생성
        let successCount = 0;
        let errorCount = 0;
        
        // 클래스 정보 파싱 (첫 번째 섹션)
        let currentSection = '';
        let classData = [];
        let teacherData = [];
        let studentData = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '') continue;
          
          if (line.includes('=== 클래스')) {
            currentSection = 'class';
            continue;
          } else if (line.includes('학생 정보')) {
            currentSection = 'student';
            continue;
          } else if (line.includes('교사 정보')) {
            currentSection = 'teacher';
            continue;
          }
          
          if (currentSection === 'class' && line.includes(',')) {
            const values = line.split(',');
            if (values.length >= 3) {
              const [name, grade, classNum] = values;
              if (name && grade && classNum && name !== '클래스 정보') {
                classData.push({
                  name: name.trim(),
                  grade: parseInt(grade),
                  class: parseInt(classNum),
                  students: [],
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            }
          } else if (currentSection === 'student' && line.includes(',')) {
            const values = line.split(',');
            if (values.length >= 6) {
              const [studentId, name, grade, classNum, number, birthDate] = values;
              if (studentId && name && studentId !== '학번') {
                studentData.push({
                  studentId: studentId.trim(),
                  name: name.trim(),
                  grade: parseInt(grade),
                  class: parseInt(classNum),
                  number: parseInt(number),
                  birthDate: birthDate.trim(),
                  role: 'student',
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            }
          }
        }
        
        // 새 데이터 생성
        for (const cls of classData) {
          await addDoc(collection(db, 'classes'), cls);
        }
        
        for (const student of studentData) {
          await addDoc(collection(db, 'accounts'), student);
        }
        
        // 데이터 새로고침
        fetchData();
        
        alert(`데이터 덮어쓰기가 완료되었습니다.\n클래스: ${classData.length}개, 학생: ${studentData.length}명`);
        
      } catch (error) {
        alert('CSV 덮어쓰기 중 오류가 발생했습니다: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  };

  // 담임 교사 이름(이메일) 형식으로 표시
  const getHomeroomTeacherDisplay = (homeroomTeacherId) => {
    if (!homeroomTeacherId) return '-';
    const teacher = teachers.find(t => t.id === homeroomTeacherId);
    if (!teacher) return homeroomTeacherId;
    return `${teacher.name} (${teacher.email})`;
  };

  // 사이드바 메뉴 아이템
  const sidebarItems = [
    { text: '클래스 관리', icon: <ClassIcon />, value: 0 },
    { text: '교사 관리', icon: <PersonIcon />, value: 1 },
    { text: '학생 관리', icon: <GroupIcon />, value: 2 },
    { text: '상벌점 관리', icon: <AssessmentIcon />, value: 3 },
    { text: '시스템 로그', icon: <DashboardIcon />, value: 4 },
    { text: '최고 관리자 전용 기능', icon: <AdminIcon />, value: 5 }
  ];

  if (!currentUser || currentUser.role !== 'super_admin') {
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

  // 모든 해상도에서 PC UI 유지 (사이드바 레이아웃)
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden', backgroundColor: '#F5F7FA' }}>
        {/* 모바일에서 사이드바 토글 버튼 */}
        {isMobileOrSmaller && (
          <IconButton
            onClick={toggleSidebar}
            sx={{
              position: 'fixed',
              top: 16,
              left: 16,
              zIndex: 1300,
              backgroundColor: 'white',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'grey.100'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* 사이드바 */}
        <Drawer
          variant={isMobileOrSmaller ? "temporary" : "permanent"}
          open={sidebarOpen}
          onClose={toggleSidebar}
          sx={{
            width: isSmallMobile ? 200 : isMobile ? 240 : 280,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: isSmallMobile ? 200 : isMobile ? 240 : 280,
              boxSizing: 'border-box',
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column'
            },
          }}
        >
          <Box sx={{ p: isSmallMobile ? 1.5 : isMobile ? 2 : 3, textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <img 
                src={logoImage} 
                alt="로고" 
                style={{ 
                  width: '50px', 
                  height: '50px'
                }}
              />
            </Box>
            <Typography 
              variant={isSmallMobile ? "body1" : isMobile ? "h6" : "h6"} 
              sx={{ fontWeight: 'bold', mb: 1 }}
            >
              관리자 대시보드
            </Typography>
            <Typography 
              variant={isSmallMobile ? "caption" : "body2"} 
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
            {sidebarItems.map((item) => (
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
          
          <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)', my: 2 }} />
          
          {/* 관리 도구 버튼들 */}
          <Box sx={{ p: 2, mt: 'auto' }}>
            <input
              accept=".xlsx"
              style={{ display: 'none' }}
              id="csv-overwrite-pc"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleCSVOverwrite(e.target.files[0]);
                }
              }}
            />
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
              {currentUser.name} 관리자님
            </Typography>

          </Box>

          {/* 통계 카드 */}
          <Grid container spacing={isMobileOrSmaller ? 1 : 3} sx={{ 
            mb: 2, 
            width: '100%',
            minWidth: isMobileOrSmaller ? '320px' : '600px',
          }}>
            <Grid xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: isMobileOrSmaller ? 1.5 : 2 }}>
                  <SchoolIcon sx={{ fontSize: isMobileOrSmaller ? 30 : 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant={isMobileOrSmaller ? "h6" : "h5"}>{classes.length}</Typography>
                  <Typography color="text.secondary" variant={isMobileOrSmaller ? "caption" : "body2"}>총 클래스 수</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: isMobileOrSmaller ? 1.5 : 2 }}>
                  <PersonIcon sx={{ fontSize: isMobileOrSmaller ? 30 : 40, color: 'secondary.main', mb: 1 }} />
                  <Typography variant={isMobileOrSmaller ? "h6" : "h5"}>{teachers.length}</Typography>
                  <Typography color="text.secondary" variant={isMobileOrSmaller ? "caption" : "body2"}>총 교사 수</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: isMobileOrSmaller ? 1.5 : 2 }}>
                  <GroupIcon sx={{ fontSize: isMobileOrSmaller ? 30 : 40, color: 'success.main', mb: 1 }} />
                  <Typography variant={isMobileOrSmaller ? "h6" : "h5"}>{students.length}</Typography>
                  <Typography color="text.secondary" variant={isMobileOrSmaller ? "caption" : "body2"}>총 학생 수</Typography>
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
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobileOrSmaller ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobileOrSmaller ? 'stretch' : 'center', 
                mb: 2,
                gap: isMobileOrSmaller ? 1 : 0
              }}>
                <TextField
                  label="클래스 검색"
                  variant="outlined"
                  size="small"
                  value={classSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    requestAnimationFrame(() => {
                      setClassSearchTerm(value);
                    });
                  }}
                  placeholder="클래스명, 학년, 반으로 검색"
                  sx={{ minWidth: isMobileOrSmaller ? '100%' : 300 }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowClassDialog(true)}
                  size={isSmallMobile ? "small" : isMobile ? "small" : isLargeDesktop ? "medium" : "medium"}
                  fullWidth={isMobileOrSmaller}
                >
                  클래스 추가
                </Button>
              </Box>
              
              <div className="table-scroll-container">
                <TableContainer component={Paper}>
                  <Table sx={{ 
                    tableLayout: isTablet ? 'fixed' : 'auto',
                    width: isTablet ? '100%' : 'auto'
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ 
                            cursor: 'pointer', 
                            userSelect: 'none', 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '30%' : 'auto',
                            minWidth: isTablet ? '120px' : 'auto'
                          }}
                          onClick={() => handleClassSort('name')}
                        >
                          클래스명 {classSortConfig.key === 'name' && (classSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}
                          onClick={() => handleClassSort('homeroomTeacher')}
                        >
                          담임교사 {classSortConfig.key === 'homeroomTeacher' && (classSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>교과목교사</TableCell>
                        <TableCell 
                          sx={{ 
                            cursor: 'pointer', 
                            userSelect: 'none', 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '20%' : 'auto',
                            minWidth: isTablet ? '80px' : 'auto'
                          }}
                          onClick={() => handleClassSort('students')}
                        >
                          학생 수 {classSortConfig.key === 'students' && (classSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                          width: isTablet ? '25%' : 'auto',
                          minWidth: isTablet ? '100px' : 'auto'
                        }}>상벌점 누계</TableCell>
                        <TableCell sx={{ 
                          fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                          width: isTablet ? '25%' : 'auto',
                          minWidth: isTablet ? '100px' : 'auto'
                        }}>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedFilteredClasses.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell sx={{ 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '30%' : 'auto',
                            minWidth: isTablet ? '120px' : 'auto'
                          }}>
                            <Button
                              variant="text"
                              onClick={() => handleClassDetails(cls)}
                              sx={{ 
                                textTransform: 'none', 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                '&:hover': { textDecoration: 'underline' },
                                fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                                p: isMobileOrSmaller ? 0.5 : 1
                              }}
                            >
                              {cls.name}
                            </Button>
                          </TableCell>
                          <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>{getHomeroomTeacherDisplay(cls.homeroomTeacher)}</TableCell>
                          <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>{cls.subjectTeachers?.length || 0}명</TableCell>
                          <TableCell sx={{ 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '20%' : 'auto',
                            minWidth: isTablet ? '80px' : 'auto'
                          }}>
                            {(() => {
                              const classStudents = students.filter(s => s.grade === cls.grade && s.class === cls.class);
                              return `${classStudents.length}명`;
                            })()}
                          </TableCell>
                          <TableCell sx={{ 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '25%' : 'auto',
                            minWidth: isTablet ? '100px' : 'auto'
                          }}>
                            <Chip
                              label={`${getClassMeritSum(cls)}점`}
                              color={getClassMeritSum(cls) >= 0 ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '25%' : 'auto',
                            minWidth: isTablet ? '100px' : 'auto'
                          }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEdit(cls, 'class')}
                            >
                              <EditIcon fontSize={isMobileOrSmaller ? "small" : "medium"} />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(cls, 'class')}
                            >
                              <DeleteIcon fontSize={isMobileOrSmaller ? "small" : "medium"} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
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
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobileOrSmaller ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobileOrSmaller ? 'stretch' : 'center', 
                mb: 2,
                gap: isMobileOrSmaller ? 1 : 0
              }}>
                <TextField
                  label="교사 검색"
                  variant="outlined"
                  size="small"
                  value={teacherSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    requestAnimationFrame(() => {
                      setTeacherSearchTerm(value);
                    });
                  }}
                  placeholder="이름, 이메일, 역할로 검색"
                  sx={{ minWidth: isMobileOrSmaller ? '100%' : 300 }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowTeacherDialog(true)}
                  fullWidth={isMobileOrSmaller}
                >
                  교사 추가
                </Button>
              </Box>
              
              <div className="table-scroll-container">
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}
                          onClick={() => handleTeacherSort('name')}
                        >
                          이름 {teacherSortConfig.key === 'name' && (teacherSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}
                          onClick={() => handleTeacherSort('email')}
                        >
                          이메일 {teacherSortConfig.key === 'email' && (teacherSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}
                          onClick={() => handleTeacherSort('role')}
                        >
                          역할 {teacherSortConfig.key === 'role' && (teacherSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}
                          onClick={() => handleTeacherSort('subject')}
                        >
                          담당 과목 {teacherSortConfig.key === 'subject' && (teacherSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>할당된 클래스</TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedFilteredTeachers.map((teacher) => {
                        // 담임 교사인 경우 담당 클래스 찾기
                        const assignedClass = teacher.role === 'homeroom_teacher' 
                          ? classes.find(c => c.homeroomTeacher === teacher.id)
                          : null;
                        
                        // 교과목 교사인 경우 담당 클래스들 찾기
                        const assignedClasses = teacher.role === 'subject_teacher'
                          ? classes.filter(c => c.subjectTeachers && c.subjectTeachers.includes(teacher.id))
                          : [];
                        
                        return (
                          <TableRow key={teacher.id}>
                            <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>{teacher.name}</TableCell>
                            <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>{teacher.email}</TableCell>
                            <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>
                              <Chip 
                                label={teacher.role === 'homeroom_teacher' ? '담임교사' : '교과목교사'}
                                color={teacher.role === 'homeroom_teacher' ? 'primary' : 'secondary'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>{teacher.subject || '-'}</TableCell>
                            <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>
                              {teacher.role === 'homeroom_teacher' 
                                ? (assignedClass ? assignedClass.name : '할당되지 않음')
                                : assignedClasses.length > 0 
                                  ? assignedClasses.map(c => c.name).join(', ')
                                  : '할당되지 않음'
                              }
                            </TableCell>
                            <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleEdit(teacher, 'teacher')}
                                  title="수정"
                                >
                                  <EditIcon fontSize={isMobileOrSmaller ? "small" : "medium"} />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="warning"
                                  onClick={async () => {
                                    
                                    const { value: confirmReset } = await Swal.fire({
                                      title: '비밀번호 초기화',
                                      text: `${teacher.name}(${teacher.email}) 교사의 비밀번호를 초기화하시겠습니까?`,
                                      icon: 'warning',
                                      showCancelButton: true,
                                      confirmButtonColor: '#ff9800',
                                      cancelButtonColor: '#d33',
                                      confirmButtonText: '초기화',
                                      cancelButtonText: '취소',
                                      customClass: {
                                        container: 'swal2-container-high-z'
                                      }
                                    });
                                    
                                    if (confirmReset) {
                                      await handlePasswordReset(teacher.email);
                                    }
                                  }}
                                  title="비밀번호 초기화"
                                >
                                  <RefreshIcon fontSize={isMobileOrSmaller ? "small" : "medium"} />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDelete(teacher, 'teacher')}
                                  title="삭제"
                                >
                                  <DeleteIcon fontSize={isMobileOrSmaller ? "small" : "medium"} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </Box>
          )}

          {tabValue === 2 && (
            <Box sx={{ 
              width: '100%',
              minWidth: isMobileOrSmaller ? '320px' : '600px',
              overflowX: 'auto',
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobileOrSmaller ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobileOrSmaller ? 'stretch' : 'center', 
                mb: 2,
                gap: isMobileOrSmaller ? 1 : 2
              }}>
                <Box sx={{ display: 'flex', flexDirection: isMobileOrSmaller ? 'column' : 'row', gap: isMobileOrSmaller ? 1 : 2, alignItems: isMobileOrSmaller ? 'stretch' : 'center' }}>
                  <TextField
                    label="학생 검색"
                    variant="outlined"
                    size="small"
                    value={studentSearchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      requestAnimationFrame(() => {
                        setStudentSearchTerm(value);
                      });
                    }}
                    placeholder="이름, 학번, 클래스로 검색"
                    sx={{ minWidth: isMobileOrSmaller ? '100%' : 300 }}
                  />
                  <input
                    accept=".xlsx"
                    style={{ display: 'none' }}
                    id="xlsx-upload-pc"
                    type="file"
                    onChange={(e) => handleXLSXUpload(e.target.files[0])}
                  />
                  <label htmlFor="xlsx-upload-pc">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<FileUploadIcon />}
                      size={isSmallMobile ? "small" : isMobile ? "small" : isLargeDesktop ? "medium" : "medium"}
                      fullWidth={isMobileOrSmaller}
                    >
                      XLSX 업로드
                    </Button>
                  </label>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setStudentForm({
                      name: '',
                      studentId: '',
                      grade: '',
                      class: '',
                      number: '',
                      birthDate: '',
                      homeroomTeacherId: '',
                      homeroomTeacherName: ''
                    });
                    setShowStudentDialog(true);
                  }}
                  size={isSmallMobile ? "small" : isMobile ? "small" : isLargeDesktop ? "medium" : "medium"}
                  fullWidth={isMobileOrSmaller}
                >
                  학생 추가
                </Button>
              </Box>
              
              <div className="table-scroll-container">
                <TableContainer component={Paper}>
                  <Table sx={{ 
                    tableLayout: isTablet ? 'fixed' : 'auto',
                    width: isTablet ? '100%' : 'auto'
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}
                          onClick={() => handleStudentSort('studentId')}
                        >
                          학번 {studentSortConfig.key === 'studentId' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            cursor: 'pointer', 
                            userSelect: 'none', 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '25%' : 'auto',
                            minWidth: isTablet ? '100px' : 'auto'
                          }}
                          onClick={() => handleStudentSort('name')}
                        >
                          이름 {studentSortConfig.key === 'name' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            cursor: 'pointer', 
                            userSelect: 'none', 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '30%' : 'auto',
                            minWidth: isTablet ? '120px' : 'auto'
                          }}
                          onClick={() => handleStudentSort('grade')}
                        >
                          학년/반/번호 {studentSortConfig.key === 'grade' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}
                          onClick={() => handleStudentSort('birthDate')}
                        >
                          생년월일 {studentSortConfig.key === 'birthDate' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            cursor: 'pointer', 
                            userSelect: 'none', 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '25%' : 'auto',
                            minWidth: isTablet ? '100px' : 'auto'
                          }}
                          onClick={() => handleStudentSort('cumulativeScore')}
                        >
                          누계 점수 {studentSortConfig.key === 'cumulativeScore' && (studentSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                          width: isTablet ? '20%' : 'auto',
                          minWidth: isTablet ? '80px' : 'auto'
                        }}>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedFilteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>
                            <Button
                              variant="text"
                              onClick={() => handleStudentClick(student)}
                              sx={{ 
                                textTransform: 'none', 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                '&:hover': { textDecoration: 'underline' },
                                fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                                p: isMobileOrSmaller ? 0.5 : 1,
                                minWidth: 'auto'
                              }}
                            >
                              {student.studentId}
                            </Button>
                          </TableCell>
                          <TableCell sx={{ 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '25%' : 'auto',
                            minWidth: isTablet ? '100px' : 'auto'
                          }}>
                            <Button
                              variant="text"
                              onClick={() => handleStudentClick(student)}
                              sx={{ 
                                textTransform: 'none', 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                '&:hover': { textDecoration: 'underline' },
                                fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                                p: isMobileOrSmaller ? 0.5 : 1,
                                minWidth: 'auto'
                              }}
                            >
                              {student.name}
                            </Button>
                          </TableCell>
                          <TableCell sx={{ 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '30%' : 'auto',
                            minWidth: isTablet ? '120px' : 'auto'
                          }}>{student.grade}학년 {student.class}반 {student.number}번</TableCell>
                          <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>{student.birthDate}</TableCell>
                          <TableCell sx={{ 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '25%' : 'auto',
                            minWidth: isTablet ? '100px' : 'auto'
                          }}>
                            <Chip
                              label={student.cumulativeScore || 0}
                              color={student.cumulativeScore > 0 ? 'success' : student.cumulativeScore < 0 ? 'error' : 'default'}
                              size="small"
                              sx={{ 
                                fontWeight: 'bold',
                                minWidth: '40px'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ 
                            fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                            width: isTablet ? '20%' : 'auto',
                            minWidth: isTablet ? '80px' : 'auto'
                          }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEdit(student, 'student')}
                            >
                              <EditIcon fontSize={isMobileOrSmaller ? "small" : "medium"} />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(student, 'student')}
                            >
                              <DeleteIcon fontSize={isMobileOrSmaller ? "small" : "medium"} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </Box>
          )}

          {tabValue === 3 && (
            <Box sx={{ 
              width: '100%',
              minWidth: isMobileOrSmaller ? '320px' : '600px',
              overflowX: 'auto',
            }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  상벌점 관리
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  모든 상벌점 내역을 조회하고 관리할 수 있습니다.
                </Typography>
              </Box>

              <div className="table-scroll-container">
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}
                          onClick={() => handleMeritSort('createdAt')}
                        >
                          처리일시 {meritSortConfig.key === 'createdAt' && (meritSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>학생</TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>학번</TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>구분</TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>점수</TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>사유</TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>요청자</TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>처리자</TableCell>
                        <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>담임여부</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedMeritRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            등록된 상벌점 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedMeritRecords.map((record) => {
                          // studentId와 student_id 두 필드 모두 확인 (기존 fetchStudentMeritHistory 로직 활용)
                          const student = students.find(s => 
                            s.id === record.studentId || 
                            s.studentId === record.studentId ||
                            s.id === record.student_id ||
                            s.studentId === record.student_id
                          );
                          const studentName = student?.name || record.studentName || record.student_name || '알 수 없음';
                          const studentId = student?.studentId || record.studentId || record.student_id || '알 수 없음';
                          const isHomeroom = record.creatorRole === 'homeroom_teacher' || record.creatorRole === 'homeroomTeacher';
                          
                          // 처리 교사 정보 (기존 로직 활용)
                          const requesterName = record.requesterName || record.requestingTeacherName || record.requester_name || record.creatorName || '알 수 없음';
                          const processorName = record.processedTeacherName || record.processedByName || record.processorName || record.creatorName || '알 수 없음';
                          
                          return (
                            <TableRow key={record.id} hover>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>
                                {record.createdAt ? new Date(record.createdAt).toLocaleString('ko-KR') : '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>
                                <Button
                                  variant="text"
                                  onClick={() => {
                                    setSelectedMeritRecord(record);
                                    setShowMeritDetailDialog(true);
                                  }}
                                  sx={{ 
                                    textTransform: 'none', 
                                    fontWeight: 'bold',
                                    color: 'primary.main',
                                    '&:hover': { textDecoration: 'underline' },
                                    fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                                    p: isMobileOrSmaller ? 0.5 : 1
                                  }}
                                >
                                  {studentName}
                                </Button>
                              </TableCell>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>
                                <Button
                                  variant="text"
                                  onClick={() => {
                                    setSelectedMeritRecord(record);
                                    setShowMeritDetailDialog(true);
                                  }}
                                  sx={{ 
                                    textTransform: 'none', 
                                    fontWeight: 'bold',
                                    color: 'primary.main',
                                    '&:hover': { textDecoration: 'underline' },
                                    fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem',
                                    p: isMobileOrSmaller ? 0.5 : 1
                                  }}
                                >
                                  {studentId}
                                </Button>
                              </TableCell>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>
                                <Chip
                                  label={record.type === 'merit' ? '상점' : '벌점'}
                                  color={record.type === 'merit' ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem' }}>
                                <Chip
                                  label={`${record.points > 0 ? '+' : ''}${record.points}점`}
                                  color={record.points > 0 ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>
                                {record.reason || record.meritReason || '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>
                                {requesterName}
                              </TableCell>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>
                                {processorName}
                              </TableCell>
                              <TableCell sx={{ fontSize: isMobileOrSmaller ? '0.75rem' : '0.875rem', display: isMobileOrSmaller ? 'none' : 'table-cell' }}>
                                <Chip
                                  label={isHomeroom ? '담임' : '교과목'}
                                  color={isHomeroom ? 'primary' : 'default'}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </Box>
          )}

          {tabValue === 4 && (
            <Box sx={{ 
              width: '100%',
              minWidth: isMobileOrSmaller ? '320px' : '600px',
              overflowX: 'auto',
            }}>
              <LogViewer />
            </Box>
          )}

          {tabValue === 5 && (
            <Box sx={{ 
              width: '100%',
              minWidth: isMobileOrSmaller ? '320px' : '600px',
              overflowX: 'auto',
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobileOrSmaller ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobileOrSmaller ? 'stretch' : 'center', 
                mb: 2,
                gap: isMobileOrSmaller ? 1 : 0
              }}>
                <Typography variant={isMobileOrSmaller ? "h6" : "h5"} sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                  ⚠️ 최고 관리자 전용 기능
                </Typography>
              </Box>
              
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant={isMobileOrSmaller ? "body1" : "h6"} gutterBottom>
                  ⚠️ 위험한 작업 경고
                </Typography>
                <Typography variant="body2">
                  아래 기능들은 시스템의 모든 데이터를 영구적으로 삭제하는 매우 위험한 작업입니다. 
                  이 작업들은 되돌릴 수 없으므로 신중하게 사용하시기 바랍니다.
                </Typography>
              </Alert>

              <Box sx={{ 
                overflowX: 'auto',
                overflowY: 'visible',
                width: '100%',
                mb: 4,
                '&::-webkit-scrollbar': {
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#888',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: '#555',
                  },
                },
              }}>
                <Grid container spacing={isMobileOrSmaller ? 2 : 3} sx={{ minWidth: isMobileOrSmaller ? '900px' : 'auto', display: 'flex', flexWrap: 'nowrap' }}>
                {/* 학생 전체 삭제 */}
                <Grid item sx={{ minWidth: isMobileOrSmaller ? '280px' : 'auto', flex: '0 0 auto' }}>
                  <Card sx={{ height: '100%', border: '2px solid #d32f2f' }}>
                    <CardContent sx={{ p: isMobileOrSmaller ? 2 : 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <DeleteForeverIcon sx={{ color: '#d32f2f', mr: 1, fontSize: isMobileOrSmaller ? 24 : 28 }} />
                        <Typography variant={isMobileOrSmaller ? "body1" : "h6"} sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                          학생 전체 삭제
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        모든 학생 계정과 관련 데이터를 영구적으로 삭제합니다.
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          삭제되는 데이터:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          <li>모든 학생 계정</li>
                          <li>학생들의 상벌점 기록</li>
                          <li>학생 관련 모든 데이터</li>
                        </ul>
                      </Box>
                      
                      <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 'bold' }}>
                        현재 학생 수: {students.length}명
                      </Typography>
                      
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        startIcon={<DeleteForeverIcon />}
                        onClick={handleDeleteAllStudents}
                        sx={{ 
                          fontWeight: 'bold',
                          '&:hover': {
                            backgroundColor: '#b71c1c'
                          }
                        }}
                        size={isMobileOrSmaller ? "small" : "medium"}
                      >
                        모든 학생 삭제
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 교사 전체 삭제 */}
                <Grid item sx={{ minWidth: isMobileOrSmaller ? '280px' : 'auto', flex: '0 0 auto' }}>
                  <Card sx={{ height: '100%', border: '2px solid #d32f2f' }}>
                    <CardContent sx={{ p: isMobileOrSmaller ? 2 : 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <DeleteForeverIcon sx={{ color: '#d32f2f', mr: 1, fontSize: isMobileOrSmaller ? 24 : 28 }} />
                        <Typography variant={isMobileOrSmaller ? "body1" : "h6"} sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                          교사 전체 삭제
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        모든 교사 계정과 관련 데이터를 영구적으로 삭제합니다.
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          삭제되는 데이터:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          <li>모든 교사 계정 (최고 관리자 제외)</li>
                          <li>담임 교사/교과목 교사 정보</li>
                          <li>교사 관련 모든 데이터</li>
                        </ul>
                      </Box>
                      
                      <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 'bold' }}>
                        현재 교사 수: {teachers.filter(t => t.role !== 'super_admin').length}명
                      </Typography>
                      
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        startIcon={<DeleteForeverIcon />}
                        onClick={handleDeleteAllTeachers}
                        sx={{ 
                          fontWeight: 'bold',
                          '&:hover': {
                            backgroundColor: '#b71c1c'
                          }
                        }}
                        size={isMobileOrSmaller ? "small" : "medium"}
                      >
                        모든 교사 삭제
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 상벌점 내역 전체 삭제 */}
                <Grid item sx={{ minWidth: isMobileOrSmaller ? '280px' : 'auto', flex: '0 0 auto' }}>
                  <Card sx={{ height: '100%', border: '2px solid #d32f2f' }}>
                    <CardContent sx={{ p: isMobileOrSmaller ? 2 : 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <DeleteForeverIcon sx={{ color: '#d32f2f', mr: 1, fontSize: isMobileOrSmaller ? 24 : 28 }} />
                        <Typography variant={isMobileOrSmaller ? "body1" : "h6"} sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                          상벌점 내역 삭제
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        모든 상벌점 기록과 관련 데이터를 영구적으로 삭제합니다.
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          삭제되는 데이터:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          <li>모든 학생의 상벌점 기록</li>
                          <li>상벌점 요청 내역</li>
                          <li>상벌점 관련 모든 데이터</li>
                        </ul>
                      </Box>
                      
                      <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 'bold' }}>
                        현재 상벌점 기록 수: {meritRecords.length}건
                      </Typography>
                      
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        startIcon={<DeleteForeverIcon />}
                        onClick={handleDeleteAllMeritRecords}
                        sx={{ 
                          fontWeight: 'bold',
                          '&:hover': {
                            backgroundColor: '#b71c1c'
                          }
                        }}
                        size={isMobileOrSmaller ? "small" : "medium"}
                      >
                        모든 상벌점 내역 삭제
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                </Grid>
              </Box>

            {/* 상벌점 사유 관리 */}
            <Typography variant={isMobileOrSmaller ? "body1" : "h6"} gutterBottom sx={{ mt: 4, mb: 2, color: '#1976d2' }}>
              📝 상벌점 사유 관리
            </Typography>
            
            <Box sx={{ 
              overflowX: 'auto',
              overflowY: 'visible',
              width: '100%',
              mb: 4,
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: '#555',
                },
              },
            }}>
              <Grid container spacing={isMobileOrSmaller ? 2 : 3} sx={{ minWidth: isMobileOrSmaller ? '600px' : 'auto', display: 'flex', flexWrap: 'nowrap' }}>
              <Grid item sx={{ minWidth: isMobileOrSmaller ? '280px' : 'auto', flex: '0 0 auto' }}>
                <Card sx={{ height: '100%', border: '1px solid #1976d2' }}>
                  <CardContent sx={{ p: isMobileOrSmaller ? 2 : 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant={isMobileOrSmaller ? "body1" : "h6"} sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                        상점 사유
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      {meritReasons.filter(reason => reason.type === 'merit').map((reason) => (
                        <Chip
                          key={reason.id}
                          label={reason.reason}
                          color="success"
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                    
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        setMeritReasonForm({ type: 'merit', reason: '' });
                        setShowMeritReasonDialog(true);
                      }}
                      size="small"
                      fullWidth={isMobileOrSmaller}
                    >
                      상점 사유 추가
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item sx={{ minWidth: isMobileOrSmaller ? '280px' : 'auto', flex: '0 0 auto' }}>
                <Card sx={{ height: '100%', border: '1px solid #d32f2f' }}>
                  <CardContent sx={{ p: isMobileOrSmaller ? 2 : 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant={isMobileOrSmaller ? "body1" : "h6"} sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                        벌점 사유
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      {meritReasons.filter(reason => reason.type === 'demerit').map((reason) => (
                        <Chip
                          key={reason.id}
                          label={reason.reason}
                          color="error"
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                    
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setMeritReasonForm({ type: 'demerit', reason: '' });
                        setShowMeritReasonDialog(true);
                      }}
                      size="small"
                      fullWidth={isMobileOrSmaller}
                    >
                      벌점 사유 추가
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              </Grid>
            </Box>

            {/* CSV 데이터 관리 */}
            <Typography variant={isMobileOrSmaller ? "body1" : "h6"} gutterBottom sx={{ mt: 4, mb: 2, color: '#1976d2' }}>
              📊 CSV 데이터 관리
            </Typography>
            
            <Box sx={{ 
              overflowX: 'auto',
              overflowY: 'visible',
              width: '100%',
              mb: 4,
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: '#555',
                },
              },
            }}>
              <Grid container spacing={isMobileOrSmaller ? 2 : 3} sx={{ display: 'flex', flexWrap: 'nowrap', width: 'fit-content' }}>
              {/* CSV 다운로드 */}
              <Grid item sx={{ minWidth: isMobileOrSmaller ? '280px' : 'auto', flex: '0 0 auto', width: 'auto' }}>
                <Card sx={{ height: '100%', border: '1px solid #1976d2' }}>
                  <CardContent sx={{ p: isMobileOrSmaller ? 2 : 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CloudDownloadIcon sx={{ color: '#1976d2', mr: 1, fontSize: isMobileOrSmaller ? 24 : 28 }} />
                      <Typography variant={isMobileOrSmaller ? "body1" : "h6"} sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                        데이터 다운로드
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      시스템의 모든 데이터를 CSV 파일로 다운로드합니다.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleDownloadStudentsXLSX}
                        fullWidth
                        size={isMobileOrSmaller ? "small" : "medium"}
                      >
                        학생 데이터 다운로드
                      </Button>
                      
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleDownloadTeachersXLSX}
                        fullWidth
                        size={isMobileOrSmaller ? "small" : "medium"}
                      >
                        교사 데이터 다운로드
                      </Button>
                      
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleDownloadClassesXLSX}
                        fullWidth
                        size={isMobileOrSmaller ? "small" : "medium"}
                      >
                        클래스 데이터 다운로드
                      </Button>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CloudDownloadIcon />}
                        onClick={handleDownloadAllDataXLSX}
                        fullWidth
                        sx={{ mt: 1, fontWeight: 'bold' }}
                        size={isMobileOrSmaller ? "small" : "medium"}
                      >
                        전체 데이터 다운로드
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* CSV 업로드 */}
              <Grid item sx={{ minWidth: isMobileOrSmaller ? '280px' : 'auto', flex: '0 0 auto', width: 'auto' }}>
                <Card sx={{ height: '100%', border: '1px solid #ff9800' }}>
                  <CardContent sx={{ p: isMobileOrSmaller ? 2 : 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <FileUploadIcon sx={{ color: '#ff9800', mr: 1, fontSize: isMobileOrSmaller ? 24 : 28 }} />
                      <Typography variant={isMobileOrSmaller ? "body1" : "h6"} sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                        데이터 업로드
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      CSV 파일을 업로드하여 데이터를 일괄 처리합니다.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <input
                        accept=".xlsx"
                        style={{ display: 'none' }}
                        id="csv-upload-admin-2"
                        type="file"
                        onChange={(e) => handleXLSXUpload(e.target.files[0])}
                      />
                      <label htmlFor="csv-upload-admin-2">
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<FileUploadIcon />}
                          component="span"
                          fullWidth
                          size={isMobileOrSmaller ? "small" : "medium"}
                        >
                          학생 데이터 업로드
                        </Button>
                      </label>
                      
                      <input
                        accept=".xlsx"
                        style={{ display: 'none' }}
                        id="csv-overwrite-admin-2"
                        type="file"
                        onChange={(e) => handleCSVOverwrite(e.target.files[0])}
                      />
                      <label htmlFor="csv-overwrite-admin-2">
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<FileUploadIcon />}
                          component="span"
                          fullWidth
                          size={isMobileOrSmaller ? "small" : "medium"}
                        >
                          전체 데이터 덮어쓰기
                        </Button>
                      </label>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* 초기화 요청 */}
              </Grid>
            </Box>

            {/* 추가 안전 장치 */}
            <Card sx={{ mt: 3, backgroundColor: '#fff3e0' }}>
              <CardContent sx={{ p: isMobileOrSmaller ? 2 : 3 }}>
                <Typography variant={isMobileOrSmaller ? "body1" : "h6"} gutterBottom sx={{ color: '#e65100' }}>
                  🔒 추가 안전 장치
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 각 삭제 작업은 확인 텍스트 입력을 요구합니다<br/>
                  • 삭제 작업은 로그에 기록됩니다<br/>
                  • 최고 관리자 계정은 보호됩니다<br/>
                  • 삭제된 데이터는 복구할 수 없습니다<br/>
                  • CSV 업로드 시 기존 데이터가 덮어쓰기될 수 있습니다
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

          {/* 다이얼로그들 */}
          {/* 클래스 추가/수정 다이얼로그 */}
          <Dialog open={showClassDialog} onClose={() => {
            setShowClassDialog(false);
            setEditingItem(null);
            setClassForm({ grade: '', class: '', name: '', homeroomTeacher: '', subjectTeachers: [] });
          }} maxWidth="md" fullWidth>
            <DialogTitle>{editingItem ? '클래스 수정' : '클래스 추가'}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                <TextField
                  fullWidth
                  label="클래스명"
                  value={classForm.name || ''}
                  InputProps={{
                    readOnly: true,
                    disabled: editingItem ? true : false,
                  }}
                  disabled={editingItem ? true : false}
                  helperText={editingItem ? "클래스명은 수정할 수 없습니다. 학년과 반을 수정하면 자동으로 변경됩니다." : "클래스명은 학년과 반으로 자동 생성됩니다"}
                  size="medium"
                />
                <TextField
                  fullWidth
                  label="학년"
                  type="number"
                  value={classForm.grade || ''}
                  onChange={(e) => setClassForm({...classForm, grade: parseInt(e.target.value)})}
                  required
                  size="medium"
                />
                <TextField
                  fullWidth
                  label="반"
                  type="number"
                  value={classForm.class || ''}
                  onChange={(e) => setClassForm({...classForm, class: parseInt(e.target.value)})}
                  required
                  size="medium"
                />
                <FormControl fullWidth required>
                  <InputLabel>담임교사</InputLabel>
                  <Select
                    value={classForm.homeroomTeacher || ''}
                    onChange={(e) => setClassForm({...classForm, homeroomTeacher: e.target.value})}
                    label="담임교사"
                    size="medium"
                    required
                  >
                    <MenuItem value="">담임교사 선택</MenuItem>
                    {teachers.filter(t => t.role === 'homeroom_teacher').map(teacher => (
                      <MenuItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>교과목 교사 (다중 선택 가능)</InputLabel>
                  <Select
                    multiple
                    value={classForm.subjectTeachers || []}
                    onChange={(e) => setClassForm({...classForm, subjectTeachers: e.target.value})}
                    label="교과목 교사 (다중 선택 가능)"
                    size="medium"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const teacher = teachers.find(t => t.id === value);
                          return teacher ? (
                            <Chip key={value} label={`${teacher.name} (${teacher.subject || '과목 미지정'})`} size="small" />
                          ) : null;
                        })}
                      </Box>
                    )}
                  >
                    {teachers.filter(t => t.role === 'subject_teacher').map(teacher => (
                      <MenuItem key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.subject || '과목 미지정'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setShowClassDialog(false);
                setEditingItem(null);
                setClassForm({ grade: '', class: '', name: '', homeroomTeacher: '', subjectTeachers: [] });
              }}>취소</Button>
              <Button onClick={editingItem ? handleUpdateClass : handleAddClass} variant="contained">
                {editingItem ? '수정' : '추가'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* 교사 추가/수정 다이얼로그 */}
          <Dialog open={showTeacherDialog} onClose={() => setShowTeacherDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>{editingItem ? '교사 수정' : '교사 추가'}</DialogTitle>
            <DialogContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                <TextField
                  fullWidth
                  label="이름"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({...teacherForm, name: e.target.value})}
                  required
                  size="medium"
                />
                <TextField
                  fullWidth
                  label="이메일"
                  type="email"
                  value={teacherForm.email}
                  onChange={editingItem ? undefined : (e) => setTeacherForm({...teacherForm, email: e.target.value})}
                  required
                  size="medium"
                  disabled={editingItem ? true : false}
                  helperText={editingItem ? "이메일은 수정할 수 없습니다." : ""}
                />
                <FormControl fullWidth>
                  <InputLabel>역할</InputLabel>
                  <Select
                    value={teacherForm.role}
                    onChange={(e) => setTeacherForm({...teacherForm, role: e.target.value})}
                    label="역할"
                    size="medium"
                  >
                    <MenuItem value="homeroom_teacher">담임교사</MenuItem>
                    <MenuItem value="subject_teacher">교과목교사</MenuItem>
                  </Select>
                </FormControl>
                {teacherForm.role === 'subject_teacher' && (
                  <TextField
                    fullWidth
                    label="담당 과목"
                    value={teacherForm.subject}
                    onChange={(e) => setTeacherForm({...teacherForm, subject: e.target.value})}
                    required
                    size="medium"
                  />
                )}
                <TextField
                  fullWidth
                  label="전화번호"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({...teacherForm, phone: e.target.value})}
                  size="medium"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setShowTeacherDialog(false);
                setEditingItem(null);
              }}>취소</Button>
              <Button onClick={editingItem ? handleUpdateTeacher : handleAddTeacher} variant="contained">
                {editingItem ? '수정' : '추가'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* 클래스 상세 정보 다이얼로그 */}
          <Dialog open={showClassDetailsDialog} onClose={() => setShowClassDetailsDialog(false)} maxWidth="lg" fullWidth>
            <DialogTitle>클래스 상세 정보</DialogTitle>
            <DialogContent>
              {selectedClass && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        {selectedClass.name}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>담임 교사:</strong> {getHomeroomTeacherDisplay(selectedClass.homeroomTeacher)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1" gutterBottom>
                        <strong>교과목 교사:</strong> {selectedClass.subjectTeachers?.length || 0}명
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body1" gutterBottom>
                        <strong>학생 수:</strong> {(() => {
                          const classStudents = students.filter(s => s.grade === selectedClass.grade && s.class === selectedClass.class);
                          return `${classStudents.length}명`;
                        })()}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="h6" gutterBottom>담임 교사 정보</Typography>
                  {(() => {
                    const homeroomTeacher = teachers.find(t => t.id === selectedClass.homeroomTeacher);
                    return homeroomTeacher ? (
                      <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, mb: 2 }}>
                        <Typography variant="body1"><strong>이름:</strong> {homeroomTeacher.name}</Typography>
                        <Typography variant="body1"><strong>이메일:</strong> {homeroomTeacher.email}</Typography>
                        <Typography variant="body1"><strong>전화번호:</strong> {homeroomTeacher.phone || '-'}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body1" color="text.secondary">담임 교사가 할당되지 않았습니다.</Typography>
                    );
                  })()}
                  
                  <Typography variant="h6" gutterBottom>교과목 교사 정보</Typography>
                  {selectedClass.subjectTeachers && selectedClass.subjectTeachers.length > 0 ? (
                    <Box sx={{ mb: 2 }}>
                      {selectedClass.subjectTeachers.map((teacherId, index) => {
                        const teacher = teachers.find(t => t.id === teacherId);
                        return teacher ? (
                          <Box key={teacherId} sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, mb: 1 }}>
                            <Typography variant="body1"><strong>이름:</strong> {teacher.name}</Typography>
                            <Typography variant="body1"><strong>담당 과목:</strong> {teacher.subject || '-'}</Typography>
                            <Typography variant="body1"><strong>이메일:</strong> {teacher.email}</Typography>
                          </Box>
                        ) : null;
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body1" color="text.secondary">교과목 교사가 할당되지 않았습니다.</Typography>
                  )}
                  
                  <Typography variant="h6" gutterBottom>학생 목록</Typography>
                  <div className="table-scroll-container">
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleClassStudentSort('number')}
                            >
                              번호 {classStudentSortConfig.key === 'number' && (classStudentSortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableCell>
                            <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleClassStudentSort('name')}
                            >
                              이름 {classStudentSortConfig.key === 'name' && (classStudentSortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableCell>
                            <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleClassStudentSort('studentId')}
                            >
                              학번 {classStudentSortConfig.key === 'studentId' && (classStudentSortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableCell>
                            <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleClassStudentSort('birthDate')}
                            >
                              생년월일 {classStudentSortConfig.key === 'birthDate' && (classStudentSortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableCell>
                            <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleClassStudentSort('cumulativeScore')}
                            >
                              누적 점수 {classStudentSortConfig.key === 'cumulativeScore' && (classStudentSortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const classStudents = students.filter(s => s.grade === selectedClass.grade && s.class === selectedClass.class);
                            const sortedStudents = [...classStudents].sort((a, b) => {
                              let comparison = 0;
                              const aValue = a[classStudentSortConfig.key];
                              const bValue = b[classStudentSortConfig.key];

                              if (aValue === null || aValue === undefined) return 1;
                              if (bValue === null || bValue === undefined) return -1;
                              
                              if (typeof aValue === 'string' && typeof bValue === 'string') {
                                comparison = aValue.localeCompare(bValue, 'ko-KR');
                              } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                                comparison = aValue - bValue;
                              } else {
                                comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
                              }

                              return classStudentSortConfig.direction === 'asc' ? comparison : -comparison;
                            });
                            
                            return sortedStudents.length > 0 ? (
                              sortedStudents.map((student) => (
                                <TableRow key={student.id}>
                                  <TableCell>{student.number}</TableCell>
                                  <TableCell>{student.name}</TableCell>
                                  <TableCell>{student.studentId}</TableCell>
                                  <TableCell>{student.birthDate}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={`${student.cumulativeScore || 0}점`}
                                      color={student.cumulativeScore > 0 ? 'success' : student.cumulativeScore < 0 ? 'error' : 'default'}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  등록된 학생이 없습니다.
                                </TableCell>
                              </TableRow>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowClassDetailsDialog(false)}>닫기</Button>
            </DialogActions>
          </Dialog>

          {/* 학생 추가/수정 다이얼로그 */}
          <Dialog open={showStudentDialog} onClose={() => setShowClassDetailsDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>{editingItem ? '학생 수정' : '학생 추가'}</DialogTitle>
            <DialogContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                <TextField
                  fullWidth
                  label="이름"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                  required
                  size="medium"
                />
                <FormControl fullWidth required>
                  <InputLabel>클래스 선택</InputLabel>
                  <Select
                    value={studentForm.selectedClassId}
                    onChange={(e) => setStudentForm({...studentForm, selectedClassId: e.target.value})}
                    label="클래스 선택"
                    size="medium"
                    required
                  >
                    {classes
                      .sort((a, b) => {
                        // 먼저 학년으로 정렬
                        if (a.grade !== b.grade) {
                          return a.grade - b.grade;
                        }
                        // 학년이 같으면 반으로 정렬
                        return a.class - b.class;
                      })
                      .map(cls => (
                        <MenuItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="번호"
                  type="number"
                  value={studentForm.number}
                  onChange={(e) => setStudentForm({...studentForm, number: e.target.value})}
                  required
                  size="medium"
                />
                <TextField
                  fullWidth
                  label="생년월일"
                  type="date"
                  value={studentForm.birthDate}
                  onChange={(e) => setStudentForm({...studentForm, birthDate: e.target.value})}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  required
                  size="medium"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setShowStudentDialog(false);
                setEditingItem(null);
              }}>취소</Button>
              <Button onClick={editingItem ? handleUpdateStudent : handleAddStudent} variant="contained">
                {editingItem ? '수정' : '추가'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* 상벌점 사유 추가 다이얼로그 */}
        <Dialog 
            open={showMeritReasonDialog}
            onClose={() => setShowMeritReasonDialog(false)}
            maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
              {meritReasonForm.type === 'merit' ? '상점 사유 추가' : '벌점 사유 추가'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                    <InputLabel>유형</InputLabel>
                  <Select
                    value={meritReasonForm.type}
                    onChange={(e) => setMeritReasonForm({...meritReasonForm, type: e.target.value})}
                      label="유형"
                  >
                    <MenuItem value="merit">상점</MenuItem>
                    <MenuItem value="demerit">벌점</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="사유"
                  value={meritReasonForm.reason}
                  onChange={(e) => setMeritReasonForm({...meritReasonForm, reason: e.target.value})}
                    placeholder="사유를 입력하세요"
                      multiline
                      rows={3}
                    />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setShowMeritReasonDialog(false)}>취소</Button>
              <Button onClick={handleAddMeritReason} variant="contained">
                추가
            </Button>
          </DialogActions>
        </Dialog>

        {/* 상벌점 상세 정보 다이얼로그 */}
        <Dialog
          open={showMeritDetailDialog}
          onClose={() => {
            setShowMeritDetailDialog(false);
            setSelectedMeritRecord(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>상벌점 상세 정보</DialogTitle>
          <DialogContent>
            {selectedMeritRecord && (() => {
              // studentId와 student_id 두 필드 모두 확인 (기존 fetchStudentMeritHistory 로직 활용)
              const student = students.find(s => 
                s.id === selectedMeritRecord.studentId || 
                s.studentId === selectedMeritRecord.studentId ||
                s.id === selectedMeritRecord.student_id ||
                s.studentId === selectedMeritRecord.student_id
              );
              const studentName = student?.name || selectedMeritRecord.studentName || selectedMeritRecord.student_name || '알 수 없음';
              const studentId = student?.studentId || selectedMeritRecord.studentId || selectedMeritRecord.student_id || '알 수 없음';
              const isHomeroom = selectedMeritRecord.creatorRole === 'homeroom_teacher' || selectedMeritRecord.creatorRole === 'homeroomTeacher';
              
              // 처리 교사 정보 (기존 로직 활용)
              const requesterName = selectedMeritRecord.requesterName || selectedMeritRecord.requestingTeacherName || selectedMeritRecord.requester_name || selectedMeritRecord.creatorName || '알 수 없음';
              const processorName = selectedMeritRecord.processedTeacherName || selectedMeritRecord.processedByName || selectedMeritRecord.processorName || selectedMeritRecord.creatorName || '알 수 없음';
              
              return (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">학생 이름</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{studentName}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">학번</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{studentId}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">구분</Typography>
                      <Chip
                        label={selectedMeritRecord.type === 'merit' ? '상점' : '벌점'}
                        color={selectedMeritRecord.type === 'merit' ? 'success' : 'error'}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">점수</Typography>
                      <Chip
                        label={`${selectedMeritRecord.points > 0 ? '+' : ''}${selectedMeritRecord.points}점`}
                        color={selectedMeritRecord.points > 0 ? 'success' : 'error'}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">사유</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedMeritRecord.reason || selectedMeritRecord.meritReason || '-'}
                      </Typography>
                    </Grid>
                    {selectedMeritRecord.description && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">상세 설명</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {selectedMeritRecord.description}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">요청자</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{requesterName}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">처리자</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{processorName}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">담임 여부</Typography>
                      <Chip
                        label={isHomeroom ? '담임교사' : '교과목 교사'}
                        color={isHomeroom ? 'primary' : 'default'}
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">처리일시</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {selectedMeritRecord.createdAt ? new Date(selectedMeritRecord.createdAt).toLocaleString('ko-KR') : '-'}
                      </Typography>
                    </Grid>
                    {selectedMeritRecord.updatedAt && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">수정일시</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {new Date(selectedMeritRecord.updatedAt).toLocaleString('ko-KR')}
                        </Typography>
                      </Grid>
                    )}
                    {selectedMeritRecord.status && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">상태</Typography>
                        <Chip
                          label={selectedMeritRecord.status === 'approved' ? '승인됨' : selectedMeritRecord.status === 'pending' ? '대기중' : selectedMeritRecord.status === 'rejected' ? '거부됨' : selectedMeritRecord.status}
                          color={selectedMeritRecord.status === 'approved' ? 'success' : selectedMeritRecord.status === 'pending' ? 'warning' : selectedMeritRecord.status === 'rejected' ? 'error' : 'default'}
                          sx={{ mb: 2 }}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Box>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowMeritDetailDialog(false);
              setSelectedMeritRecord(null);
            }}>닫기</Button>
          </DialogActions>
        </Dialog>

        {/* 학생 상벌점 이력 다이얼로그 */}
        <Dialog 
          open={showStudentMeritHistoryDialog} 
          onClose={() => setShowStudentMeritHistoryDialog(false)} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle>
            {selectedStudentForHistory ? `${selectedStudentForHistory.name} 학생의 상벌점 이력` : '상벌점 이력'}
          </DialogTitle>
          <DialogContent>
            {selectedStudentForHistory && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  학생 정보
                      </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      학번: {selectedStudentForHistory.studentId}
                      </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      학년/반/번호: {selectedStudentForHistory.grade}학년 {selectedStudentForHistory.class}반 {selectedStudentForHistory.number}번
                      </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" component="span">
                        누계 점수: 
                      </Typography>
                      <Chip
                        label={selectedStudentForHistory.cumulativeScore || 0}
                        color={selectedStudentForHistory.cumulativeScore > 0 ? 'success' : selectedStudentForHistory.cumulativeScore < 0 ? 'error' : 'default'}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Typography variant="h6" gutterBottom>
              상벌점 기록
                          </Typography>
            
            {studentMeritHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                상벌점 기록이 없습니다.
                            </Typography>
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
                            <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>날짜</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>유형</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>점수</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>사유</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>상세 내용</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>처리 교사</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                    {studentMeritHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}
                        </TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <Chip
                            label={record.type === 'merit' ? '상점' : '벌점'}
                            color={record.type === 'merit' ? 'success' : 'error'}
                                      size="small"
                                    />
                                  </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Chip
                            label={record.points > 0 ? `+${record.points}` : record.points}
                            color={record.points > 0 ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>{record.reason || ''}</TableCell>
                        <TableCell>{record.description || ''}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {record.processedTeacherName || record.teacherName || record.creatorName || 'N/A'}
                                </TableCell>
                              </TableRow>
                    ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowStudentMeritHistoryDialog(false)}>닫기</Button>
          </DialogActions>
        </Dialog>
                    </Box>
        </Box>
  );

};

export default AdminDashboard;
