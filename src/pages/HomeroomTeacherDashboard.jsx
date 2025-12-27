import React, { useState, useEffect, useMemo } from 'react';
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
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Checkbox,
  useTheme,
  useMediaQuery,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Logout as LogoutIcon,
  Group as GroupIcon,
  RequestPage as RequestIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  FileUpload as FileUploadIcon,
  Menu as MenuIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import SortableTable from '../components/SortableTable';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc,
  query,
  where,
  orderBy,
  writeBatch,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { 
  logMeritAction, 
  logSystemAction, 
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

const HomeroomTeacherDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // 사이드바 토글 함수
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [meritRecords, setMeritRecords] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [meritReasons, setMeritReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 학년 관리 관련 상태
  const [gradeClasses, setGradeClasses] = useState([]);
  const [selectedGradeClass, setSelectedGradeClass] = useState(null);
  const [gradeStudents, setGradeStudents] = useState([]);
  const [showGradeMeritDialog, setShowGradeMeritDialog] = useState(false);
  const [selectedGradeStudent, setSelectedGradeStudent] = useState(null);
  const [gradeMeritForm, setGradeMeritForm] = useState({
    type: 'merit',
    points: '1',
    reason: '',
    description: ''
  });
  
  // 교사 정보 캐시
  const [teacherInfoCache, setTeacherInfoCache] = useState({});
  
  // 학년 관리 요청 내역 관련 상태
  const [gradeRequests, setGradeRequests] = useState([]);
  const [gradeManagementRequests, setGradeManagementRequests] = useState([]);
  const [gradeRequestFilter, setGradeRequestFilter] = useState('all'); // all, pending, approved, rejected
  const [gradeTabValue, setGradeTabValue] = useState(0); // 0: 학생 목록, 1: 요청 내역
  
  // 학년 관리 검색 상태
  const [gradeSearchTerm, setGradeSearchTerm] = useState('');
  
  // 요청 내역 정렬 관련 상태
  const [gradeRequestSortConfig, setGradeRequestSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  

  const theme = useTheme();
  const { isMobile, isTablet, isDesktop, isSmallMobile, isLargeDesktop, isMobileOrSmaller, isTabletOrLarger } = useResponsive();
  
  const [showMeritDialog, setShowMeritDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showStudentDetailsDialog, setShowStudentDetailsDialog] = useState(false);
  const [showInquiryDialog, setShowInquiryDialog] = useState(false);
  const [showInquiryDetailDialog, setShowInquiryDetailDialog] = useState(false);
  const [showInquiryCreateDialog, setShowInquiryCreateDialog] = useState(false);
  const [showStudentMeritHistoryDialog, setShowStudentMeritHistoryDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);
  
  // 검색 상태
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // 상벌점 기록 정렬 상태
  const [meritSortConfig, setMeritSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });
  
  // 학년 관리 학생 정렬 상태
  const [gradeStudentSortConfig, setGradeStudentSortConfig] = useState({
    key: 'studentId',
    direction: 'asc'
  });
  
  // 필터링 상태
  const [requestFilter, setRequestFilter] = useState('all'); // all, pending, processed
  const [meritFilter, setMeritFilter] = useState('all'); // all, merit, demerit
  
  // 일괄 처리 상태
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // 다이얼로그 상태 모니터링

  // classes와 students가 변경될 때마다 학년 클래스 목록 업데이트
  useEffect(() => {
    console.log('classes/students useEffect 트리거됨:', { 
      classesLength: classes.length, 
      studentsLength: students.length,
      currentUser: !!currentUser 
    });
    if (classes.length > 0 && students.length > 0 && currentUser) {
      console.log('fetchGradeClasses 호출 예정');
      fetchGradeClasses();
    } else {
      console.log('fetchGradeClasses 호출 조건 미충족:', { 
        classesLength: classes.length, 
        studentsLength: students.length,
        currentUser: !!currentUser 
      });
    }
  }, [classes, students, currentUser]);
  
  const [meritForm, setMeritForm] = useState({
    studentId: '',
    type: 'demerit',
    reason: '',
    value: 1,
    description: ''
  });

  const [inquiryForm, setInquiryForm] = useState({
    title: '',
    content: '',
    category: '일반'
  });


  // 정렬 상태
  const [sortConfig, setSortConfig] = useState({
    key: 'studentId',
    direction: 'asc'
  });

  // 정렬 함수
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 검색 필터링된 학생 데이터
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return students;
    
    return students.filter(student => 
      student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.grade?.toString().includes(studentSearchTerm) ||
      student.class?.toString().includes(studentSearchTerm) ||
      student.number?.toString().includes(studentSearchTerm) ||
      student.birthDate?.includes(studentSearchTerm)
    );
  }, [students, studentSearchTerm]);

  // 담임교사 기준 카운트
  const homeroomTeacherCounts = useMemo(() => {
    const requestedToMe = pendingRequests.filter(request => 
      request.status === 'pending'
    ).length;
    
    const processedByMe = meritRecords.filter(record => 
      record.processedBy === currentUser.uid
    ).length;
    
    return {
      requestedToMe,
      processedByMe
    };
  }, [pendingRequests, meritRecords, currentUser.uid]);

  // 상벌점 기록 정렬 함수
  const handleMeritSort = (key) => {
    setMeritSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };


  // 일괄 처리 함수들
  const handleSelectRequest = (requestId) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRequests([]);
    } else {
      const pendingRequests = filteredRequests.filter(req => req.status === 'pending');
      setSelectedRequests(pendingRequests.map(req => req.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) {
      await Swal.fire({
        title: '알림',
        text: '선택된 요청이 없습니다.',
        icon: 'info'
      });
      return;
    }

    const result = await Swal.fire({
      title: '일괄 승인',
      text: `선택된 ${selectedRequests.length}개의 요청을 모두 승인하시겠습니까?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '승인',
      cancelButtonText: '취소',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        for (const requestId of selectedRequests) {
          await handleRequestAction(requestId, 'approved');
        }
        
        setSelectedRequests([]);
        setSelectAll(false);
        
        // 데이터 새로고침
        await fetchPendingRequests();
        await fetchStudents();
        await fetchMeritRecords();
        
        await Swal.fire({
          title: '성공',
          text: `${selectedRequests.length}개의 요청이 승인되었습니다.`,
          icon: 'success'
        });
      } catch (error) {
        await Swal.fire({
          title: '오류',
          text: '일괄 승인 중 오류가 발생했습니다: ' + error.message,
          icon: 'error'
        });
      }
    }
  };

  const handleBulkReject = async () => {
    if (selectedRequests.length === 0) {
      await Swal.fire({
        title: '알림',
        text: '선택된 요청이 없습니다.',
        icon: 'info'
      });
      return;
    }

    const result = await Swal.fire({
      title: '일괄 거절',
      text: `선택된 ${selectedRequests.length}개의 요청을 모두 거절하시겠습니까?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '거절',
      cancelButtonText: '취소',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      try {
        for (const requestId of selectedRequests) {
          await handleRequestAction(requestId, 'rejected');
        }
        
        setSelectedRequests([]);
        setSelectAll(false);
        
        // 데이터 새로고침
        await fetchPendingRequests();
        await fetchStudents();
        await fetchMeritRecords();
        
        await Swal.fire({
          title: '성공',
          text: `${selectedRequests.length}개의 요청이 거절되었습니다.`,
          icon: 'success'
        });
      } catch (error) {
        await Swal.fire({
          title: '오류',
          text: '일괄 거절 중 오류가 발생했습니다: ' + error.message,
          icon: 'error'
        });
      }
    }
  };

  // 개별 요청 승인 함수
  const handleApproveRequest = async (requestId) => {
    try {
      const result = await Swal.fire({
        title: '요청 승인',
        text: '이 요청을 승인하시겠습니까?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '승인',
        cancelButtonText: '취소'
      });

      if (result.isConfirmed) {
        await handleRequestAction(requestId, 'approved');
        await Swal.fire({
          title: '성공',
          text: '요청이 승인되었습니다.',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('요청 승인 오류:', error);
      await Swal.fire({
        title: '오류',
        text: '요청 승인 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
  };

  // 개별 요청 거부 함수
  const handleRejectRequest = async (requestId) => {
    try {
      const result = await Swal.fire({
        title: '요청 거부',
        text: '이 요청을 거부하시겠습니까?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: '거부',
        cancelButtonText: '취소'
      });

      if (result.isConfirmed) {
        await handleRequestAction(requestId, 'rejected');
        await Swal.fire({
          title: '성공',
          text: '요청이 거부되었습니다.',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('요청 거부 오류:', error);
      await Swal.fire({
        title: '오류',
        text: '요청 거부 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
  };

  // 요청 처리 함수 (일괄 처리용)
  const handleRequestAction = async (requestId, status) => {
    try {
      // 요청 데이터 가져오기
      const requestRef = doc(db, 'merit_demerit_requests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        throw new Error('요청을 찾을 수 없습니다.');
      }
      
      const requestData = requestDoc.data();
      
      console.log('=== handleRequestAction 디버깅 ===');
      console.log('requestId:', requestId);
      console.log('status:', status);
      console.log('requestData:', requestData);
      console.log('requestData.studentId:', requestData.studentId);
      console.log('requestData.student_id:', requestData.student_id);
      console.log('requestData.points:', requestData.points);
      console.log('requestData.value:', requestData.value);
      
      await logMeritAction(
        currentUser,
        LOG_CATEGORIES.MERIT_MANAGEMENT.middle.PROCESS,
        `상벌점 요청 ${status === 'approved' ? '승인' : '거부'}`,
        `요청 ID: ${requestId}`
      );

      // 요청 상태 업데이트
      await updateDoc(requestRef, {
        status: status,
        responseAt: new Date(),
        responseNote: status === 'approved' ? '담임 교사 승인' : '담임 교사 거부'
      });

      // 시스템 로그 추가
      try {
        await addDoc(collection(db, 'system_logs'), {
          userId: currentUser.uid,
          userName: currentUser.name || currentUser.email,
          userRole: currentUser.role,
          majorCategory: '상벌점 관리',
          middleCategory: '상벌점 요청 처리',
          minorCategory: '',
          action: `상벌점 요청 ${status === 'approved' ? '승인' : '거부'}`,
          details: `${currentUser.name || currentUser.email}님이 ${requestData.studentName || '학생'}의 상벌점 요청을 ${status === 'approved' ? '승인' : '거부'}했습니다. (요청 교사: ${requestData.requestingTeacherName || '교과목 교사'})`,
          timestamp: new Date(),
          createdAt: new Date()
        });
      } catch (logError) {
        console.error('시스템 로그 기록 오류:', logError);
      }

      if (status === 'approved') {
        // studentId 안전하게 가져오기
        const studentId = requestData.studentId || requestData.student_id;
        
        console.log('=== studentId 디버깅 ===');
        console.log('requestData.studentId:', requestData.studentId);
        console.log('requestData.student_id:', requestData.student_id);
        console.log('최종 studentId:', studentId);
        
        if (!studentId) {
          console.error('studentId를 찾을 수 없습니다. requestData 전체:', requestData);
          throw new Error('학생 ID를 찾을 수 없습니다.');
        }
        
        const meritData = {
          studentId: studentId,
          studentName: requestData.studentName || requestData.student_name,
          type: requestData.type,
          reason: requestData.reason,
          points: requestData.points || requestData.value,
          value: requestData.points || requestData.value,
          description: requestData.description || '',
          creatorId: requestData.requestingTeacherId || requestData.requester_id,
          creatorName: requestData.requestingTeacherName || requestData.requester_name,
          creatorRole: 'subject_teacher',
          processedBy: requestData.requestingTeacherId || requestData.requester_id,
          processedByName: requestData.requestingTeacherName || requestData.requester_name || requestData.teacherName || requestData.teacher_name,
          status: 'approved',
          requestTeacherId: requestData.requestingTeacherId || requestData.requester_id,
          createdAt: new Date(),
          updatedAt: new Date(),
          changeHistory: [{
            changedBy: currentUser.uid,
            changedAt: new Date(),
            oldValue: null,
            newValue: requestData.points || requestData.value || 0,
            oldReason: null,
            newReason: requestData.reason
          }]
        };
        
        await addDoc(collection(db, 'merit_demerit_records'), meritData);
        
        // 학생의 누계 점수 업데이트
        const studentRef = doc(db, 'accounts', studentId);
        const studentDoc = await getDoc(studentRef);
        if (studentDoc.exists()) {
          const currentScore = studentDoc.data().cumulativeScore || 0;
          const points = requestData.points || requestData.value || 0;
          // points가 이미 음수/양수로 저장되어 있으므로 그대로 더하기
          const newScore = currentScore + points;
          
          console.log('=== cumulativeScore 업데이트 디버깅 ===');
          console.log('현재 점수:', currentScore);
          console.log('추가할 점수:', points);
          console.log('새로운 점수:', newScore);
          console.log('요청 타입:', requestData.type);
          
          await updateDoc(studentRef, {
            cumulativeScore: newScore,
            updatedAt: new Date()
          });
        }
      }

      // 데이터 새로고침
      await fetchPendingRequests();
      await fetchMeritRecords();
    } catch (error) {
      console.error('요청 처리 오류:', error);
      throw error;
    }
  };

  // 정렬된 상벌점 기록 데이터
  const sortedMeritRecords = useMemo(() => {
    if (!meritSortConfig.key) return meritRecords;

    return [...meritRecords].sort((a, b) => {
      let comparison = 0;
      
      if (meritSortConfig.key === 'createdAt') {
        const aDate = new Date(a.createdAt);
        const bDate = new Date(b.createdAt);
        comparison = aDate - bDate;
      } else {
        const aValue = a[meritSortConfig.key];
        const bValue = b[meritSortConfig.key];

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

      return meritSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [meritRecords, meritSortConfig]);

  // 필터링된 요청 데이터
  const filteredRequests = useMemo(() => {
    if (requestFilter === 'all') return pendingRequests;
    if (requestFilter === 'pending') return pendingRequests.filter(req => req.status === 'pending');
    if (requestFilter === 'processed') return pendingRequests.filter(req => req.status === 'processed');
    return pendingRequests;
  }, [pendingRequests, requestFilter]);

  // 필터링된 상벌점 기록 데이터
  const filteredMeritRecords = useMemo(() => {
    if (meritFilter === 'all') return sortedMeritRecords;
    if (meritFilter === 'merit') return sortedMeritRecords.filter(record => record.type === 'merit');
    if (meritFilter === 'demerit') return sortedMeritRecords.filter(record => record.type === 'demerit');
    return sortedMeritRecords;
  }, [sortedMeritRecords, meritFilter]);

  // 학년 관리 학생 정렬 및 필터링
  const filteredGradeStudents = useMemo(() => {
    if (!gradeStudents || gradeStudents.length === 0) return [];

    // 검색 필터링
    let filtered = gradeStudents;
    if (gradeSearchTerm.trim()) {
      const searchTerm = gradeSearchTerm.toLowerCase().trim();
      filtered = gradeStudents.filter(student => {
        const name = (student.name || '').toLowerCase();
        const studentId = (student.studentId || student.id || '').toLowerCase();
        const homeroomTeacher = (student.homeroomTeacher || '').toLowerCase();
        const homeroomTeacherName = (student.homeroomTeacherName || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               studentId.includes(searchTerm) || 
               homeroomTeacher.includes(searchTerm) ||
               homeroomTeacherName.includes(searchTerm);
      });
    }

    // 정렬
    if (!gradeStudentSortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (gradeStudentSortConfig.key === 'studentId') {
        comparison = (a.studentId || a.id || '').localeCompare(b.studentId || b.id || '');
      } else if (gradeStudentSortConfig.key === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (gradeStudentSortConfig.key === 'homeroomTeacher') {
        const aTeacher = getHomeroomTeacherDisplay(a);
        const bTeacher = getHomeroomTeacherDisplay(b);
        comparison = aTeacher.localeCompare(bTeacher);
      }
      
      return gradeStudentSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [gradeStudents, gradeStudentSortConfig, gradeClasses, gradeSearchTerm]);

  // 정렬된 학생 데이터
  const sortedStudents = useMemo(() => {
    if (!sortConfig.key) return filteredStudents;

    return [...filteredStudents].sort((a, b) => {
      let comparison = 0;
      
      if (sortConfig.key === 'grade') {
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
      } else if (sortConfig.key === 'name') {
        const aValue = a.name || '';
        const bValue = b.name || '';
        comparison = aValue.localeCompare(bValue, 'ko-KR');
      } else if (sortConfig.key === 'studentId') {
        const aValue = a.studentId || a.id || '';
        const bValue = b.studentId || b.id || '';
        comparison = aValue.localeCompare(bValue, 'ko-KR');
      } else if (sortConfig.key === 'cumulativeScore') {
        const aValue = a.cumulativeScore || 0;
        const bValue = b.cumulativeScore || 0;
        comparison = aValue - bValue;
      } else {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

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

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredStudents, sortConfig]);

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
      let unsubscribeResetRequests = null;
      let unsubscribeInquiries = null;
      let unsubscribeClasses = null;
      
      // 기존 리스너들 정리
      const cleanup = () => {
        if (unsubscribeStudents) {
          unsubscribeStudents();
        }
        if (unsubscribeRequests) {
          unsubscribeRequests();
        }
        if (unsubscribeLogs) {
          unsubscribeLogs();
        }
        if (unsubscribeResetRequests) {
          unsubscribeResetRequests();
        }
        if (unsubscribeInquiries) {
          unsubscribeInquiries();
        }
        if (unsubscribeClasses) {
          unsubscribeClasses();
        }
      };
      
      const cleanupOnUnmount = () => {
        cleanup();
      };
      
      const setupListeners = async () => {
        try {
          cleanup();
          
          await fetchStudents();
          await fetchPendingRequests();
          await fetchMeritRecords();
          await fetchResetRequests();
          await fetchInquiries();
          await fetchGradeClasses();
          
          const setupRealtimeListeners = () => {
            const classesRef = collection(db, 'classes');
            const allClassesQuery = query(classesRef);
            
            unsubscribeClasses = onSnapshot(allClassesQuery, (classesSnapshot) => {
              const allClasses = classesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              
              console.log('=== 클래스 데이터 상세 디버깅 ===');
              console.log('전체 클래스 개수:', allClasses.length);
              allClasses.forEach((cls, index) => {
                console.log(`클래스 ${index + 1}:`, {
                  id: cls.id,
                  name: cls.name,
                  grade: cls.grade,
                  class: cls.class,
                  homeroom_teacher: cls.homeroom_teacher,
                  homeroom_teacher_id: cls.homeroom_teacher_id,
                  homeroom_teacher_name: cls.homeroom_teacher_name,
                  homeroom_teacher_email: cls.homeroom_teacher_email,
                  teacher_name: cls.teacher_name,
                  teacher_email: cls.teacher_email
                });
              });
              
              setClasses(allClasses);
              
              console.log('=== 클래스 정보 실시간 업데이트 시작 ===');
              console.log('클래스 정보 실시간 업데이트:', allClasses.length, '개 클래스');
              console.log('현재 사용자 정보:', {
                uid: currentUser.uid,
                id: currentUser.id,
                name: currentUser.name,
                role: currentUser.role
              });
              console.log('현재 사용자 전체 객체:', currentUser);
              console.log('모든 클래스 정보:', allClasses);
              
              // 각 클래스의 상세 정보 확인
              allClasses.forEach((cls, index) => {
                console.log(`클래스 ${index + 1} 상세 정보:`, {
                  id: cls.id,
                  name: cls.name,
                  grade: cls.grade,
                  class: cls.class,
                  homeroomTeacher: cls.homeroomTeacher,
                  homeroomTeacherId: cls.homeroomTeacherId,
                  teacherId: cls.teacherId,
                  담임교사: cls.담임교사,
                  담임교사ID: cls.담임교사ID,
                  모든_필드: Object.keys(cls),
                  전체_데이터: cls
                });
              });
              
              // 담임 교사가 담당하는 클래스들 필터링
              const assignedClasses = allClasses.filter(cls => {
                // 사용자 ID를 여러 방법으로 확인
                const userId = currentUser.uid || currentUser.id || currentUser.userId;
                const userEmail = currentUser.email;
                
                console.log('사용자 ID 확인:', {
                  uid: currentUser.uid,
                  id: currentUser.id,
                  userId: currentUser.userId,
                  email: currentUser.email,
                  최종_사용자_ID: userId
                });
                
                // AdminDashboard에서 설정하는 필드명에 맞춰서 확인
                const isAssigned = 
                  cls.homeroomTeacher === userId ||
                  cls.homeroomTeacherId === userId ||
                  cls.homeroomTeacher === currentUser.uid ||
                  cls.homeroomTeacherId === currentUser.uid ||
                  cls.homeroomTeacher === currentUser.id ||
                  cls.homeroomTeacherId === currentUser.id ||
                  cls.homeroomTeacher === userEmail ||
                  cls.homeroomTeacherId === userEmail;
                
                console.log(`실시간 클래스 ${cls.grade}학년 ${cls.class}반 담당 교사 검사:`, {
                  클래스_ID: cls.id,
                  homeroomTeacher: cls.homeroomTeacher,
                  homeroomTeacherId: cls.homeroomTeacherId,
                  currentUserUid: currentUser.uid,
                  currentUserId: currentUser.id,
                  최종_사용자_ID: userId,
                  사용자_이메일: userEmail,
                  isAssigned,
                  매칭_상세: {
                    homeroomTeacher_최종ID_매칭: cls.homeroomTeacher === userId,
                    homeroomTeacherId_최종ID_매칭: cls.homeroomTeacherId === userId,
                    homeroomTeacher_uid_매칭: cls.homeroomTeacher === currentUser.uid,
                    homeroomTeacherId_uid_매칭: cls.homeroomTeacherId === currentUser.uid,
                    homeroomTeacher_id_매칭: cls.homeroomTeacher === currentUser.id,
                    homeroomTeacherId_id_매칭: cls.homeroomTeacherId === currentUser.id,
                    homeroomTeacher_이메일_매칭: cls.homeroomTeacher === userEmail,
                    homeroomTeacherId_이메일_매칭: cls.homeroomTeacherId === userEmail
                  }
                });
                
                return isAssigned;
              });
              
              console.log('실시간 - 전체 클래스 수:', allClasses.length);
              console.log('실시간 - 담당 클래스 수:', assignedClasses.length);
              console.log('실시간 - 담당 클래스들:', assignedClasses);
              
              // 담당 클래스가 정확히 하나인지 확인
              if (assignedClasses.length !== 1) {
                console.warn(`실시간 - 담당 클래스가 ${assignedClasses.length}개입니다. 정확히 1개여야 합니다.`);
                // 담당 클래스가 1개가 아니면 학생 목록 초기화
                console.log('실시간 - 담당 클래스가 1개가 아니므로 학생 목록 초기화');
                setStudents([]);
                return;
              }
              
              // 담당 클래스들의 학년과 반 정보를 Set으로 저장
              const validClassKeys = new Set();
              const validClassIds = new Set();
              
              assignedClasses.forEach(cls => {
                validClassKeys.add(`${cls.grade}-${cls.class}`);
                validClassIds.add(cls.id);
                console.log(`실시간 - 담당 클래스 추가: ${cls.grade}학년 ${cls.class}반 (ID: ${cls.id})`);
              });
              
              console.log('실시간 - 유효한 클래스 키들:', Array.from(validClassKeys));
              console.log('실시간 - 유효한 클래스 ID들:', Array.from(validClassIds));
              
              // 기존 학생 구독 해제
              if (unsubscribeStudents) {
                console.log('기존 학생 리스너 정리');
                unsubscribeStudents();
              }
              
              // 학생 실시간 업데이트
              const studentsRef = collection(db, 'accounts');
              const studentsQuery = query(studentsRef, where('role', '==', 'student'));
              
              unsubscribeStudents = onSnapshot(studentsQuery, (studentsSnapshot) => {
                const studentsData = [];
                
                console.log('=== 학생 필터링 시작 ===');
                console.log('실시간 - 전체 학생 수:', studentsSnapshot.size);
                console.log('실시간 - 유효한 클래스 키들:', Array.from(validClassKeys));
                console.log('현재 사용자 정보 (학생 필터링):', {
                  uid: currentUser.uid,
                  id: currentUser.id,
                  name: currentUser.name,
                  role: currentUser.role
                });
                
                studentsSnapshot.forEach((doc) => {
                    const studentData = doc.data();
                    const classKey = `${studentData.grade}-${studentData.class}`;
                    
                    // 학생의 클래스가 담당 클래스에 포함되는지 확인
                    const isInAssignedClass = validClassKeys.has(classKey);
                    
                    // 학생의 담임 교사가 현재 로그인한 담임 교사와 일치하는지 확인
                    const userId = currentUser.uid || currentUser.id || currentUser.userId;
                    const userEmail = currentUser.email;
                    
                    const isHomeroomTeacherMatch = 
                      studentData.homeroomTeacher === userId ||
                      studentData.homeroomTeacherId === userId ||
                      studentData.homeroomTeacher === currentUser.uid ||
                      studentData.homeroomTeacherId === currentUser.uid ||
                      studentData.homeroomTeacher === currentUser.id ||
                      studentData.homeroomTeacherId === currentUser.id ||
                      studentData.homeroomTeacher === userEmail ||
                      studentData.homeroomTeacherId === userEmail;
                    
                    console.log(`실시간 - 학생 ${studentData.name} (${studentData.grade}학년 ${studentData.class}반) 검사:`, {
                      classKey,
                      studentClassId: studentData.classId,
                      studentHomeroomTeacher: studentData.homeroomTeacher,
                      studentHomeroomTeacherId: studentData.homeroomTeacherId,
                      currentUserUid: currentUser.uid,
                      currentUserId: currentUser.id,
                      isInAssignedClass,
                      isHomeroomTeacherMatch,
                      validClassKeys: Array.from(validClassKeys)
                    });
                    
                    // 유효한 클래스에 속하고 담임 교사가 일치하는 학생만 필터링
                    if (isInAssignedClass && isHomeroomTeacherMatch) {
                      console.log(`✓ 실시간 - 학생 ${studentData.name} 추가됨 - 담당 클래스이고 담임 교사 일치`);
                      studentsData.push({
                        id: doc.id,
                        ...studentData
                      });
                    } else {
                      if (!isInAssignedClass) {
                        console.log(`✗ 실시간 - 학생 ${studentData.name} 제외됨 - 담당 클래스가 아님`);
                      } else if (!isHomeroomTeacherMatch) {
                        console.log(`✗ 실시간 - 학생 ${studentData.name} 제외됨 - 담임 교사가 일치하지 않음`);
                      }
                    }
                  });
                  
                  console.log('=== 학생 필터링 결과 ===');
                  console.log('실시간 - 최종 필터링된 학생들:', studentsData);
                  console.log('실시간 - 필터링된 학생 수:', studentsData.length);
                  console.log('=== 학생 필터링 완료 ===');
                  setStudents(studentsData);
                }, (error) => {
                  console.error('학생 실시간 업데이트 오류:', error);
                });
            }, (error) => {
              console.error('클래스 실시간 업데이트 오류:', error);
            });
            
            // 클래스 구독 해제 함수는 onSnapshot에서 반환됨
          };
          
          setupRealtimeListeners();
          
          // 담임 교사 대시보드 접근 로그 기록
          try {
            await addDoc(collection(db, 'system_logs'), {
              userId: currentUser.uid,
              userName: currentUser.name || currentUser.email,
              userRole: currentUser.role,
              majorCategory: '교사 활동',
              middleCategory: '대시보드 접근',
              minorCategory: '',
              action: '담임 교사 대시보드 접근',
              details: `${currentUser.name || currentUser.email}님이 담임 교사 대시보드에 접근했습니다.`,
              timestamp: new Date(),
              createdAt: new Date()
            });
          } catch (logError) {
            console.error('시스템 로그 기록 오류:', logError);
          }
          
          // 디버깅을 위한 테스트 함수
          console.log('=== 담임 교사 대시보드 초기화 완료 ===');
          console.log('현재 사용자:', currentUser);
          console.log('실시간 리스너 설정 완료');
        } catch (error) {
          setError(error.message);
        }
      };
      
      setupListeners();
      
      // 상벌점 사유 로드
      console.log('담임교사 useEffect - fetchMeritReasons 호출');
      fetchMeritReasons();
      
      // 학년 관리 요청 내역 로드
      console.log('담임교사 useEffect - fetchGradeRequests 호출');
      fetchGradeRequests();
      
      // cleanup 함수들 반환
      return cleanupOnUnmount;
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudents(),
        fetchPendingRequests(),
        fetchMeritRecords(),
        fetchResetRequests(),
        fetchInquiries(),
        fetchGradeRequests()
      ]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // accounts 컬렉션에서 학생들을 조회
      const studentsRef = collection(db, 'accounts');
      const studentsQuery = query(studentsRef, where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      
      console.log('전체 학생 수:', studentsSnapshot.size);
      
      // 현재 담임교사가 담당하는 학생들만 필터링
      const userId = currentUser.uid || currentUser.id || currentUser.userId;
      const userEmail = currentUser.email;
      
      const myStudents = [];
      studentsSnapshot.forEach((doc) => {
        const studentData = doc.data();
        
        // 학생의 담임교사가 현재 로그인한 담임교사와 일치하는지 확인
        const isMyStudent = 
          studentData.homeroomTeacher === userId ||
          studentData.homeroomTeacherId === userId ||
          studentData.homeroomTeacher === currentUser.uid ||
          studentData.homeroomTeacherId === currentUser.uid ||
          studentData.homeroomTeacher === currentUser.id ||
          studentData.homeroomTeacherId === currentUser.id ||
          studentData.homeroomTeacher === userEmail ||
          studentData.homeroomTeacherId === userEmail;
        
        console.log(`학생 ${studentData.name} 검사:`, {
          studentId: doc.id,
          homeroomTeacher: studentData.homeroomTeacher,
          homeroomTeacherId: studentData.homeroomTeacherId,
          currentUserUid: currentUser.uid,
          currentUserId: currentUser.id,
          최종_사용자_ID: userId,
          사용자_이메일: userEmail,
          isMyStudent
        });
        
        if (isMyStudent) {
          myStudents.push({
            id: doc.id,
            ...studentData
          });
        }
      });
      
      console.log('내 담당 학생 수:', myStudents.length);
      console.log('내 담당 학생들:', myStudents);
      
      setStudents(myStudents);
      setLoading(false);
    
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };


  const fetchPendingRequests = async () => {
    try {
      console.log('fetchPendingRequests 호출됨, currentUser.uid:', currentUser.uid);
      
      // 교과목 교사가 보낸 상벌점 요청들 조회 (담임 교사가 승인해야 함)
      const requestsRef = collection(db, 'merit_demerit_requests');
      
      // 여러 필드로 요청 조회 (homeroomTeacherId, homeroomTeacher, teacherId 등)
      const q = query(
        requestsRef,
        where('status', '==', 'pending')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('전체 상벌점 요청 조회 결과:', snapshot.size, '개');
        console.log('모든 요청들:', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // 담임 교사와 관련된 요청만 필터링
        const requestsData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              requesterName: data.requestingTeacherName || data.requester_name || data.requesterName || data.teacherName || data.teacher_name || '알 수 없음',
              studentName: data.studentName || data.student_name || '알 수 없음',
              points: data.points || data.value || 0,
              reason: data.reason || data.meritReason || 'N/A',
              description: data.description || data.detailDescription || '',
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || data.requestedAt?.toDate?.() || new Date())
            };
          })
          .filter(request => {
            const isHomeroomTeacher = 
              request.homeroomTeacherId === currentUser.uid ||
              request.homeroom_teacher_id === currentUser.uid ||
              request.homeroomTeacher === currentUser.uid ||
              request.homeroom_teacher === currentUser.uid ||
              request.teacherId === currentUser.uid;
            
            console.log(`요청 ${request.id}: homeroomTeacherId=${request.homeroomTeacherId}, homeroom_teacher_id=${request.homeroom_teacher_id}, homeroomTeacher=${request.homeroomTeacher}, homeroom_teacher=${request.homeroom_teacher}, teacherId=${request.teacherId}, 현재UID=${currentUser.uid}, 매칭=${isHomeroomTeacher}`);
            
            return isHomeroomTeacher;
          })
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log('필터링된 요청 데이터:', requestsData);
        setPendingRequests(requestsData);
      }, (error) => {
        console.error('상벌점 요청 조회 오류:', error);
        setError(error.message);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('fetchPendingRequests 오류:', error);
      setError(error.message);
      return null;
    }
  };

  const fetchMeritRecords = async () => {
    try {
      console.log('=== fetchMeritRecords 디버깅 시작 ===');
      console.log('현재 사용자 UID:', currentUser.uid);
      console.log('담당 학생들:', students.map(s => ({ id: s.id, name: s.name, class: s.class })));
      
      const recordsRef = collection(db, 'merit_demerit_records');
      const q = query(
        recordsRef,
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('전체 상벌점 기록 조회 결과:', snapshot.size, '개');
        
        // 본인 클래스의 학생 ID 목록 생성
        const myStudentIds = students.map(student => student.id);
        console.log('본인 클래스 학생 ID 목록:', myStudentIds);
        
        const recordsData = snapshot.docs
          .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
          }))
          .filter(record => {
            // 본인 클래스의 학생들만 필터링
            const isMyStudent = myStudentIds.includes(record.studentId);
            console.log(`기록 ${record.id}: studentId=${record.studentId}, studentName=${record.studentName}, 본인학생=${isMyStudent}`);
            return isMyStudent;
          });
        
        console.log('필터링된 상벌점 기록:', recordsData.length, '개');
        setMeritRecords(recordsData);
      }, (error) => {
        console.error('상벌점 기록 조회 오류:', error);
        setError(error.message);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('fetchMeritRecords 오류:', error);
      setError(error.message);
      return null;
    }
  };

  // 특정 학생의 상벌점 기록 조회 함수
  const fetchStudentMeritHistory = async (studentId) => {
    try {
      console.log('=== 특정 학생 상벌점 기록 조회 시작 ===');
      console.log('조회할 학생 ID:', studentId);
      
      const recordsRef = collection(db, 'merit_demerit_records');
      
      // studentId로 조회
      const q = query(recordsRef, where('studentId', '==', studentId));
      
      console.log('쿼리 실행 (studentId):', studentId);
      const snapshot = await getDocs(q);
      console.log('쿼리 결과:', snapshot.size, '개');
      
      // 결과 처리
      const allDocs = snapshot.docs;
      const uniqueDocs = allDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );
      
      console.log('중복 제거 후 총 문서 수:', uniqueDocs.length);
      
      const recordsData = uniqueDocs.map(doc => {
        const data = doc.data();
        console.log('문서 데이터:', doc.id, data);
        
        // 처리 교사 정보 설정
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
        
        return {
          id: doc.id,
          ...data,
          points: data.points || data.value || 0,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          processedTeacherName: processedTeacherName
        };
      });
      
      // 클라이언트에서 날짜 기준 내림차순 정렬
      recordsData.sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB - dateA;
      });
      
      console.log('최종 상벌점 기록:', recordsData);
      return recordsData;
    } catch (error) {
      console.error('특정 학생 상벌점 기록 조회 오류:', error);
      return [];
    }
  };

  // 학생별 누적 점수 계산 및 업데이트 함수
  const updateStudentCumulativeScores = (recordsData) => {
    console.log('=== updateStudentCumulativeScores 시작 ===');
    console.log('기록 데이터:', recordsData);
    
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
      
      console.log(`학생 ${studentId}: ${record.type} ${points}점 추가, 누적: ${studentScores[studentId]}`);
    });
    
    console.log('계산된 학생별 점수:', studentScores);
    
    // 학생 데이터 업데이트
    setStudents(prevStudents => {
      const updatedStudents = prevStudents.map(student => {
        const cumulativeScore = studentScores[student.id] || 0;
        console.log(`학생 ${student.name}(${student.id}) 누적 점수: ${cumulativeScore}`);
        return {
          ...student,
          cumulativeScore: cumulativeScore
        };
      });
      console.log('업데이트된 학생 데이터:', updatedStudents);
      return updatedStudents;
    });
  };

  // 상벌점 등록 함수
  const handleMeritSubmit = async () => {
    const startTime = Date.now();
    try {
      console.log('=== 상벌점 등록 시작 ===');
      console.log('선택된 학생:', selectedStudent);
      console.log('상벌점 폼 데이터:', meritForm);
      console.log('요청자:', currentUser.name || currentUser.email);
      console.log('요청 시간:', new Date().toLocaleString());

      // 상벌점 등록 시도 로그
      await logSecurityAction(
        currentUser,
        LOG_CATEGORIES.SECURITY.middle.LOGIN_ATTEMPT,
        '상벌점 등록 시도',
        `학생: ${selectedStudent?.name || 'N/A'}, 유형: ${meritForm.type || 'N/A'}, 점수: ${meritForm.value || 'N/A'}`
      );

      if (!selectedStudent) {
        await logError(
          currentUser,
          new Error('학생이 선택되지 않음'),
          '상벌점 등록 - 학생 선택 오류',
          { meritForm }
        );
        
        await Swal.fire({
          title: '오류',
          text: '학생을 선택해주세요.',
          icon: 'error'
        });
        return;
      }

      if (!meritForm.type || !meritForm.reason || !meritForm.value) {
        await logError(
          currentUser,
          new Error('필수 필드 누락'),
          '상벌점 등록 - 필수 필드 누락',
          { meritForm, selectedStudent: selectedStudent.name }
        );
        
        await Swal.fire({
          title: '오류',
          text: '모든 필드를 입력해주세요.',
          icon: 'error'
        });
        return;
      }

      // 상벌점 기록 생성
      const meritRecord = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        studentGrade: selectedStudent.grade,
        studentClass: selectedStudent.class,
        studentNumber: selectedStudent.number,
        type: meritForm.type,
        points: meritForm.type === 'merit' ? meritForm.value : -meritForm.value,
        reason: meritForm.reason,
        description: meritForm.description || '',
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || '담임교사',
        homeroomTeacherId: currentUser.uid,
        creatorId: currentUser.uid,
        creatorName: currentUser.name || currentUser.displayName || '담임교사',
        creatorRole: 'homeroom_teacher',
        createdAt: new Date(),
        status: 'approved' // 담임교사가 직접 등록하므로 바로 승인
      };

      console.log('생성할 상벌점 기록:', meritRecord);

      // Firestore에 저장 - merit_demerit_records만 사용
      const recordsRef = collection(db, 'merit_demerit_records');
      
      // merit_demerit_records에 저장
      const recordDocRef = await addDoc(recordsRef, meritRecord);
      console.log('merit_demerit_records 저장 완료:', recordDocRef.id);

      // accounts 컬렉션의 cumulativeScore 업데이트
      const accountRef = doc(db, 'accounts', selectedStudent.id);
      const currentScore = selectedStudent.cumulativeScore || 0;
      const newScore = currentScore + meritRecord.points;
      
      console.log(`=== 학생 점수 업데이트 시작 ===`);
      console.log(`학생 ID: ${selectedStudent.id}`);
      console.log(`학생 이름: ${selectedStudent.name}`);
      console.log(`현재 점수: ${currentScore}`);
      console.log(`추가할 점수: ${meritRecord.points}`);
      console.log(`새로운 점수: ${newScore}`);
      
      try {
        // accounts 문서가 존재하는지 확인
        const accountDoc = await getDoc(accountRef);
        console.log(`accounts 문서 존재 여부: ${accountDoc.exists()}`);
        
        if (accountDoc.exists()) {
          // 문서가 존재하면 업데이트
          console.log(`기존 accounts 문서 업데이트 중...`);
          await updateDoc(accountRef, {
            cumulativeScore: newScore
          });
          console.log(`✅ 학생 ${selectedStudent.name}의 누적 점수 업데이트 완료: ${currentScore} → ${newScore}`);
        } else {
          // 문서가 없으면 생성
          console.log(`새 accounts 문서 생성 중...`);
          await setDoc(accountRef, {
            id: selectedStudent.id,
            name: selectedStudent.name,
            studentId: selectedStudent.studentId || selectedStudent.id,
            grade: selectedStudent.grade,
            class: selectedStudent.class,
            number: selectedStudent.number,
            role: 'student',
            cumulativeScore: newScore,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`✅ 학생 ${selectedStudent.name}의 accounts 문서 생성 및 누적 점수 설정 완료: ${newScore}`);
        }
        console.log(`=== 학생 점수 업데이트 완료 ===`);
      } catch (error) {
        console.error('❌ 학생 점수 업데이트 중 오류:', error);
        // 점수 업데이트 실패해도 상벌점 기록은 저장되었으므로 계속 진행
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 상세한 등록 완료 로그
      await logDetailedAction(
        currentUser,
        LOG_CATEGORIES.MERIT_MANAGEMENT.major,
        LOG_CATEGORIES.MERIT_MANAGEMENT.middle.CREATE,
        '상벌점 등록 완료',
        `학생 ${selectedStudent.name}에게 ${meritForm.type === 'merit' ? '상점' : '벌점'} ${Math.abs(meritForm.value)}점 등록`,
        {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          meritType: meritForm.type,
          points: meritForm.value,
          reason: meritForm.reason,
          description: meritForm.description,
          duration: duration,
          operation: 'merit_registration'
        }
      );

      // 성능 로그
      await logPerformance(
        currentUser,
        '상벌점 등록',
        duration,
        {
          studentName: selectedStudent.name,
          meritType: meritForm.type,
          points: meritForm.value
        }
      );

      // 기존 로그도 유지
      await logMeritAction(
        currentUser,
        LOG_CATEGORIES.MERIT_MANAGEMENT.middle.CREATE,
        `상벌점 등록: ${selectedStudent.name} (${meritForm.type === 'merit' ? '상점' : '벌점'} ${Math.abs(meritForm.value)}점)`
      );

      console.log('=== 상벌점 등록 완료 ===');
      console.log('소요 시간:', duration, 'ms');
      console.log('등록된 상벌점:', meritForm.type, Math.abs(meritForm.value), '점');
      console.log('대상 학생:', selectedStudent.name);

      // 다이얼로그 닫기
      setShowMeritDialog(false);
      setMeritForm({ studentId: '', type: 'demerit', reason: '', value: 1, description: '' });
      setSelectedStudent(null);

      // 데이터 새로고침
      await fetchMeritRecords();

      await Swal.fire({
        title: '성공',
        text: '상벌점이 성공적으로 등록되었습니다!',
        icon: 'success'
      });

    } catch (error) {
      console.error('상벌점 등록 오류:', error);
      
      // 오류 로그
      await logError(
        currentUser,
        error,
        '상벌점 등록',
        {
          studentId: selectedStudent?.id,
          studentName: selectedStudent?.name,
          meritForm,
          operation: 'handleMeritSubmit'
        }
      );

      await Swal.fire({
        title: '오류',
        text: '상벌점 등록 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
  };

  const fetchResetRequests = async () => {
    try {
      const resetRequestsRef = collection(db, 'reset_requests');
      const q = query(
        resetRequestsRef,
        where('teacherId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate?.() || new Date(doc.data().requestedAt),
          expiresAt: doc.data().expiresAt?.toDate?.() || new Date(doc.data().expiresAt)
        })).sort((a, b) => new Date(b.requestedAt) - new Date(a.createdAt));
        setResetRequests(requestsData);
      }, (error) => {
        setError(error.message);
      });
      
      return unsubscribe;
    } catch (error) {
      return null;
    }
  };

  const fetchInquiries = async () => {
    try {
      console.log('fetchInquiries 호출됨, currentUser:', currentUser);
      console.log('currentUser.uid:', currentUser?.uid);
      
      const inquiriesRef = collection(db, 'inquiries');
      const q = query(
        inquiriesRef,
        where('userId', '==', currentUser.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('문의 조회 결과:', snapshot.size, '개');
        const inquiriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log('문의 데이터:', inquiriesData);
        setInquiries(inquiriesData);
      }, (error) => {
        console.error('문의 조회 오류:', error);
        setError(error.message);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('fetchInquiries 오류:', error);
      setError(error.message);
      return null;
    }
  };

  const fetchMeritReasons = async () => {
    try {
      console.log('담임교사 - fetchMeritReasons 시작');
      const reasonsRef = collection(db, 'merit_reasons');
      const snapshot = await getDocs(reasonsRef);
      const reasonsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('담임교사 - 가져온 상벌점 사유들:', reasonsData);
      setMeritReasons(reasonsData);
    } catch (error) {
      console.error('상벌점 사유 조회 오류:', error);
    }
  };

  // 학년 관리 요청 내역 조회 함수
  const fetchGradeRequests = async () => {
    try {
      console.log('=== fetchGradeRequests 디버깅 시작 ===');
      console.log('현재 사용자 UID:', currentUser.uid);
      console.log('현재 사용자 UID 타입:', typeof currentUser.uid);
      console.log('현재 사용자 UID 길이:', currentUser.uid?.length);
      
      const requestsRef = collection(db, 'merit_demerit_requests');
      
      // 먼저 모든 요청을 조회해서 디버깅
      const allRequestsQuery = query(requestsRef);
      const allSnapshot = await getDocs(allRequestsQuery);
      console.log('전체 상벌점 요청 개수:', allSnapshot.size);
      
      allSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`요청 ${index + 1}:`, {
          id: doc.id,
          requester_id: data.requester_id,
          requester_role: data.requester_role,
          studentName: data.studentName || data.student_name,
          status: data.status
        });
      });
      
      // 필터링된 쿼리
      const q = query(
        requestsRef,
        where('requester_id', '==', currentUser.uid),
        where('requester_role', '==', 'homeroom_teacher')
      );
      
      // getDocs로 즉시 조회
      const snapshot = await getDocs(q);
      console.log('필터링된 학년 관리 요청 조회 결과:', snapshot.size, '개');
      
      if (snapshot.size === 0) {
        console.log('필터링 결과가 없습니다. requester_id와 requester_role을 다시 확인해보세요.');
      }
      
      const requestsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          requestedAt: doc.data().requestedAt?.toDate?.() || new Date(doc.data().requestedAt)
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      console.log('학년 관리 요청 데이터:', requestsData);
      setGradeRequests(requestsData);
      setGradeManagementRequests(requestsData);
      
      // 실시간 리스너도 설정
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('실시간 업데이트 - 학년 관리 요청 조회 결과:', snapshot.size, '개');
        
        const requestsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
            requestedAt: doc.data().requestedAt?.toDate?.() || new Date(doc.data().requestedAt)
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setGradeRequests(requestsData);
        setGradeManagementRequests(requestsData);
      }, (error) => {
        console.error('학년 관리 요청 실시간 조회 오류:', error);
        setError(error.message);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('fetchGradeRequests 오류:', error);
      setError(error.message);
      return null;
    }
  };

  // 학년 관리 요청 승인/거부 함수들
  const handleApproveGradeRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'merit_demerit_requests', requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: currentUser.uid
      });
      console.log('학년 관리 요청 승인 완료:', requestId);
    } catch (error) {
      console.error('학년 관리 요청 승인 오류:', error);
    }
  };

  const handleRejectGradeRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'merit_demerit_requests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: currentUser.uid
      });
      console.log('학년 관리 요청 거부 완료:', requestId);
    } catch (error) {
      console.error('학년 관리 요청 거부 오류:', error);
    }
  };

  // 교사 정보 로드 함수
  const loadTeacherInfo = async (uid) => {
    if (!uid || teacherInfoCache[uid]) {
      return teacherInfoCache[uid] || null;
    }
    
    try {
      const accountsRef = collection(db, 'accounts');
      const q = query(accountsRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const teacherDoc = querySnapshot.docs[0];
        const teacherInfo = {
          name: teacherDoc.data().name || teacherDoc.data().displayName || '알 수 없음',
          email: teacherDoc.data().email || ''
        };
        
        // 캐시에 저장
        setTeacherInfoCache(prev => ({
          ...prev,
          [uid]: teacherInfo
        }));
        
        return teacherInfo;
      }
      return null;
    } catch (error) {
      console.error('교사 정보 조회 오류:', error);
      return null;
    }
  };

  // 학년 관리 관련 함수들
  const fetchGradeClasses = async () => {
    try {
      console.log('=== fetchGradeClasses 디버깅 시작 ===');
      console.log('현재 사용자 UID:', currentUser?.uid);
      console.log('클래스 목록 개수:', classes.length);
      console.log('현재 내 담당 학생들:', students);
      
      if (students.length === 0) {
        console.log('내 담당 학생이 없어서 학년을 확인할 수 없습니다.');
        setGradeClasses([]);
        return;
      }
      
      // 내 담당 클래스의 학년 확인
      const myGrade = students[0].grade;
      console.log('내 클래스 학년:', myGrade);
      
      // 모든 클래스에서 같은 학년 클래스들 찾기 (내가 담당하지 않는 클래스만)
      const myClassNumbers = students.map(s => s.class);
      console.log('내가 담당하는 반들:', myClassNumbers);
      
      const sameGradeClasses = classes.filter(c => 
        c.grade === myGrade && !myClassNumbers.includes(c.class)
      );
      
      console.log('같은 학년이지만 내가 담당하지 않는 클래스들:', sameGradeClasses);
      
      setGradeClasses(sameGradeClasses);
      
      // 교사 정보 미리 로드
      const teacherUids = sameGradeClasses
        .map(cls => cls.homeroomTeacherId || cls.homeroom_teacher_id || cls.homeroom_teacher || cls.teacher_id)
        .filter(uid => uid && uid.trim() !== '');
      
      console.log('로드할 교사 UID들:', teacherUids);
      
      // 각 교사 정보를 비동기로 로드
      teacherUids.forEach(uid => {
        if (!teacherInfoCache[uid]) {
          loadTeacherInfo(uid);
        }
      });
      
      // 학생들 조회 (클래스 기반이 아닌 전체 학생 기반)
      setTimeout(() => {
        fetchGradeStudents();
      }, 100);
      
      console.log('=== fetchGradeClasses 디버깅 끝 ===');
    } catch (error) {
      console.error('학년 클래스 조회 오류:', error);
    }
  };

  const fetchGradeStudents = async () => {
    try {
      console.log('=== fetchGradeStudents 디버깅 시작 ===');
      console.log('현재 내 담당 학생들:', students);
      
      // 내 담당 클래스의 학년 확인
      const myGrade = students.length > 0 ? students[0].grade : null;
      console.log('내 담당 클래스 학년:', myGrade);
      
      if (!myGrade) {
        console.log('내 담당 클래스 학년을 확인할 수 없습니다.');
        setGradeStudents([]);
        return;
      }
      
      // 내가 담당하는 학생들의 ID 목록
      const myStudentIds = students.map(s => s.id);
      console.log('내가 담당하는 학생 ID들:', myStudentIds);
      
      // 모든 학생 조회
      const studentsRef = collection(db, 'accounts');
      const studentsQuery = query(studentsRef, where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      
      console.log('전체 학생 수:', studentsSnapshot.size);
      
      const gradeStudentsData = [];
      studentsSnapshot.forEach((doc) => {
        const studentData = doc.data();
        
        // 같은 학년이면서 내가 담당하지 않는 학생인지 확인
        const isSameGrade = studentData.grade === myGrade;
        const isNotMyStudent = !myStudentIds.includes(doc.id);
        
        console.log(`학생 ${studentData.name} (${studentData.grade}학년 ${studentData.class}반) 검사:`, {
          isSameGrade,
          isNotMyStudent,
          studentId: doc.id
        });
        
        if (isSameGrade && isNotMyStudent) {
          console.log(`✓ 학생 ${studentData.name} 추가됨 - 같은 학년, 내 담당 학생이 아님`);
          gradeStudentsData.push({
            id: doc.id,
            ...studentData
          });
        } else {
          if (!isSameGrade) {
            console.log(`✗ 학생 ${studentData.name} 제외됨 - 다른 학년 (${studentData.grade}학년)`);
          } else if (!isNotMyStudent) {
            console.log(`✗ 학생 ${studentData.name} 제외됨 - 내 담당 학생`);
          }
        }
      });
      
      console.log('최종 학년 관리 학생 데이터:', gradeStudentsData);
      setGradeStudents(gradeStudentsData);
      console.log('=== fetchGradeStudents 디버깅 끝 ===');
    } catch (error) {
      console.error('학년 학생 조회 오류:', error);
    }
  };

  // 학년 관리 학생 정렬 함수
  const handleGradeStudentSort = (key) => {
    setGradeStudentSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 요청 내역 정렬 함수
  const handleGradeRequestSort = (key) => {
    setGradeRequestSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };



  // 정렬된 요청 내역 목록
  const sortedGradeRequests = useMemo(() => {
    if (!gradeManagementRequests || gradeManagementRequests.length === 0) return [];
    
    return [...gradeManagementRequests].sort((a, b) => {
      const { key, direction } = gradeRequestSortConfig;
      let aValue, bValue;
      
      switch (key) {
        case 'studentName':
          aValue = a.studentName || '';
          bValue = b.studentName || '';
          break;
        case 'requesterName':
          aValue = a.requesterName || '';
          bValue = b.requesterName || '';
          break;
        case 'requestContent':
          aValue = a.requestContent || '';
          bValue = b.requestContent || '';
          break;
        case 'createdAt':
          aValue = a.createdAt?.toDate?.() || new Date(0);
          bValue = b.createdAt?.toDate?.() || new Date(0);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [gradeManagementRequests, gradeRequestSortConfig]);


  // 담임교사 표시 형식 함수
  const getHomeroomTeacherDisplay = (student) => {
    console.log('=== getHomeroomTeacherDisplay 디버깅 ===');
    console.log('학생:', student.name, '학년/반:', student.grade, student.class);
    console.log('학생 데이터:', student);
    
    // 학생 데이터에서 직접 담임교사 정보 가져오기
    const teacherUid = student.homeroomTeacherId || 
                      student.homeroom_teacher_id || 
                      student.homeroom_teacher || 
                      student.teacher_id || '';
    
    console.log('담임교사 UID:', teacherUid);
    
    // UID가 있으면 캐시에서 교사 정보 확인
    if (teacherUid && teacherUid.trim() !== '') {
      const cachedTeacherInfo = teacherInfoCache[teacherUid];
      if (cachedTeacherInfo) {
        // 모바일에서는 이름만, PC에서는 이름(이메일) 형태로 표시
        const displayText = isMobileOrSmaller 
          ? cachedTeacherInfo.name
          : (cachedTeacherInfo.email && cachedTeacherInfo.email.trim() !== '' 
            ? `${cachedTeacherInfo.name}(${cachedTeacherInfo.email})`
            : cachedTeacherInfo.name);
        console.log('캐시된 담임교사 정보:', cachedTeacherInfo, '표시:', displayText);
        return displayText;
      } else {
        // 캐시에 없으면 비동기로 로드
        loadTeacherInfo(teacherUid);
        return '교사 정보 로딩 중...';
      }
    }
    
    // UID가 없는 경우 학생 데이터에서 직접 가져오기
    const teacherName = student.homeroom_teacher_name || 
                       student.teacher_name || 
                       student.teacher ||
                       student.homeroomTeacherName ||
                       '담임교사 없음';
    const teacherEmail = student.homeroomTeacherEmail || 
                        student.homeroom_teacher_email || 
                        student.teacher_email || 
                        student.email || '';
    
    console.log('담임교사 이름 (학생 데이터):', teacherName);
    console.log('담임교사 이메일 (학생 데이터):', teacherEmail);
    
    // 모바일에서는 이름만, PC에서는 이름(이메일) 형태로 표시
    if (isMobileOrSmaller) {
      return teacherName;
    } else {
      if (teacherEmail && teacherEmail.trim() !== '') {
        return `${teacherName}(${teacherEmail})`;
      } else {
        return teacherName;
      }
    }
  };

  const handleGradeMeritRequest = (student) => {
    console.log('=== handleGradeMeritRequest 디버깅 시작 ===');
    console.log('선택된 학생:', student);
    console.log('사용 가능한 클래스들:', gradeClasses);
    
    // 학생의 클래스 정보 찾기 (grade-class 조합으로 찾기)
    const studentClass = gradeClasses.find(c => 
      c.grade === student.grade && c.class === student.class
    );
    
    console.log('찾은 클래스:', studentClass);
    
    if (!studentClass) {
      console.warn('클래스를 찾을 수 없습니다. 기본 정보로 진행합니다.');
      // 클래스를 찾을 수 없어도 기본 정보로 진행
      const fallbackClass = {
        id: `fallback_${student.grade}_${student.class}`,
        name: `${student.grade}학년 ${student.class}반`,
        grade: student.grade,
        class: student.class,
        homeroom_teacher: '알 수 없음',
        homeroom_teacher_email: '',
        homeroom_teacher_id: ''
      };
      setSelectedGradeClass(fallbackClass);
    } else {
      setSelectedGradeClass(studentClass);
    }
    
    setSelectedGradeStudent(student);
    setGradeMeritForm({
      type: 'demerit', // 기본값을 벌점으로 설정
      points: '1', // 기본 점수를 1로 설정
      reason: '',
      description: ''
    });
    setShowGradeMeritDialog(true);
  };

  const handleGradeMeritSubmit = async () => {
    try {
      console.log('=== handleGradeMeritSubmit 디버깅 시작 ===');
      console.log('selectedGradeStudent:', selectedGradeStudent);
      console.log('selectedGradeClass:', selectedGradeClass);
      console.log('gradeMeritForm:', gradeMeritForm);
      
      if (!gradeMeritForm.points || !gradeMeritForm.reason) {
        await Swal.fire({
          icon: 'warning',
          title: '입력 오류',
          text: '점수와 사유를 모두 입력해주세요.'
        });
        return;
      }

      if (!selectedGradeStudent) {
        await Swal.fire({
          icon: 'error',
          title: '오류',
          text: '학생 정보를 찾을 수 없습니다.'
        });
        return;
      }

      if (!selectedGradeClass) {
        await Swal.fire({
          icon: 'error',
          title: '오류',
          text: '클래스 정보를 찾을 수 없습니다.'
        });
        return;
      }

      // 담임교사 정보 추출 (실제 필드명에 맞춰 수정)
      const homeroomTeacherId = selectedGradeClass.homeroomTeacherId || 
                               selectedGradeClass.homeroom_teacher_id || 
                               selectedGradeClass.homeroom_teacher || 
                               selectedGradeClass.teacher_id || '';
      const homeroomTeacherName = selectedGradeClass.homeroomTeacher || 
                                 selectedGradeClass.homeroom_teacher || 
                                 selectedGradeClass.homeroom_teacher_name || 
                                 selectedGradeClass.teacher_name || 
                                 selectedGradeClass.teacher ||
                                 '알 수 없음';
      const homeroomTeacherEmail = selectedGradeClass.homeroomTeacherEmail || 
                                  selectedGradeClass.homeroom_teacher_email || 
                                  selectedGradeClass.teacher_email || 
                                  selectedGradeClass.email || '';

      console.log('=== 담임교사 정보 추출 결과 ===');
      console.log('homeroomTeacherId:', homeroomTeacherId);
      console.log('homeroomTeacherName:', homeroomTeacherName);
      console.log('homeroomTeacherEmail:', homeroomTeacherEmail);

      // 상벌점 요청 생성
      const requestData = {
        studentId: selectedGradeStudent.id,
        student_id: selectedGradeStudent.id,
        studentName: selectedGradeStudent.name,
        student_name: selectedGradeStudent.name,
        studentEmail: selectedGradeStudent.email || '',
        student_email: selectedGradeStudent.email || '',
        classId: selectedGradeClass.id,
        class_id: selectedGradeClass.id,
        className: selectedGradeClass.name || `${selectedGradeStudent.grade}학년 ${selectedGradeStudent.class}반`,
        class_name: selectedGradeClass.name || `${selectedGradeStudent.grade}학년 ${selectedGradeStudent.class}반`,
        studentGrade: selectedGradeClass.grade || selectedGradeStudent.grade,
        studentClass: selectedGradeClass.name || `${selectedGradeStudent.grade}학년 ${selectedGradeStudent.class}반`,
        grade: selectedGradeClass.grade || selectedGradeStudent.grade,
        homeroomTeacherId: homeroomTeacherId,
        homeroom_teacher_id: homeroomTeacherId,
        homeroomTeacher: homeroomTeacherName,
        homeroom_teacher: homeroomTeacherName,
        homeroomTeacherEmail: homeroomTeacherEmail,
        homeroom_teacher_email: homeroomTeacherEmail,
        requester_id: currentUser.uid,
        requester_name: currentUser.displayName || currentUser.name || currentUser.email,
        requester_email: currentUser.email,
        requester_role: 'homeroom_teacher',
        requestingTeacherId: currentUser.uid,
        requestingTeacherName: currentUser.displayName || currentUser.name || currentUser.email,
        requestingTeacherRole: 'homeroom_teacher',
        type: gradeMeritForm.type,
        points: gradeMeritForm.type === 'demerit' ? -Math.abs(parseInt(gradeMeritForm.points)) : Math.abs(parseInt(gradeMeritForm.points)),
        value: gradeMeritForm.type === 'demerit' ? -Math.abs(parseInt(gradeMeritForm.points)) : Math.abs(parseInt(gradeMeritForm.points)),
        reason: gradeMeritForm.reason,
        description: gradeMeritForm.description || gradeMeritForm.reason,
        status: 'pending',
        requestedAt: new Date(),
        createdAt: new Date()
      };

      console.log('요청 데이터:', requestData);

      await addDoc(collection(db, 'merit_demerit_requests'), requestData);

      // 로그 기록
      await logMeritAction(
        currentUser.uid,
        'merit_request_created',
        `학년 관리에서 상벌점 요청 생성: ${selectedGradeStudent.name} (${gradeMeritForm.type === 'merit' ? '상점' : '벌점'} ${gradeMeritForm.type === 'demerit' ? -Math.abs(parseInt(gradeMeritForm.points)) : Math.abs(parseInt(gradeMeritForm.points))}점)`,
        {
          student_id: selectedGradeStudent.id,
          student_name: selectedGradeStudent.name,
          class_id: selectedGradeClass.id,
          class_name: selectedGradeClass.name,
          points: gradeMeritForm.type === 'demerit' ? -Math.abs(parseInt(gradeMeritForm.points)) : Math.abs(parseInt(gradeMeritForm.points)),
          reason: gradeMeritForm.reason
        }
      );

      await Swal.fire({
        icon: 'success',
        title: '요청 완료',
        text: '상벌점 요청이 성공적으로 전송되었습니다.'
      });

      setShowGradeMeritDialog(false);
      setSelectedGradeStudent(null);
      setGradeMeritForm({
        type: 'merit',
        points: '',
        reason: '',
        description: ''
      });

    } catch (error) {
      console.error('상벌점 요청 오류:', error);
      await Swal.fire({
        icon: 'error',
        title: '요청 실패',
        text: '상벌점 요청 중 오류가 발생했습니다.'
      });
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

      setInquiryForm({
        title: '',
        content: '',
        category: '일반'
      });

      setShowInquiryCreateDialog(false);

      await Swal.fire({
        title: '성공',
        text: '문의가 성공적으로 등록되었습니다.',
        icon: 'success'
      });

      await logSystemAction(
        currentUser,
        LOG_CATEGORIES.SYSTEM.middle.INQUIRY,
        '문의 등록',
        `제목: ${inquiryData.title}`
      );

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

        await logSystemAction(
          currentUser,
          LOG_CATEGORIES.SYSTEM.middle.INQUIRY,
          '답글 등록',
          `문의 ID: ${inquiryId}`
        );
      }
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '답글 등록 중 오류가 발생했습니다.',
        icon: 'error'
      });
    }
  };

  const handleResetApproval = async (requestId, approved) => {
    try {
      if (!requestId) {
        throw new Error('요청 ID가 유효하지 않습니다.');
      }
      
      const requestRef = doc(db, 'reset_requests', requestId);
      await updateDoc(requestRef, {
        status: approved ? 'approved' : 'rejected',
        respondedAt: new Date(),
        response: approved ? '동의' : '거부'
      });

      await logSystemAction(
        currentUser,
        LOG_CATEGORIES.SYSTEM.middle.RESET_APPROVAL,
        `전체 초기화 ${approved ? '동의' : '거부'}`,
        `요청 ID: ${requestId}`
      );

      await Swal.fire({
        title: approved ? '동의 완료' : '거부 완료',
        text: approved ? '초기화에 동의하셨습니다.' : '초기화를 거부하셨습니다.',
        icon: approved ? 'success' : 'info'
      });
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '초기화 동의 처리 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
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

  // XLSX 업로드 함수 (담임교사용)
  const handleXLSXUpload = async (file) => {
    if (!file) return;
    
    try {
      setLoading(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 첫 번째 시트 사용 (Sheet1)
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const studentsData = XLSX.utils.sheet_to_json(worksheet);
          
          if (studentsData.length === 0) {
            setLoading(false);
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

          // 담임교사의 클래스 정보 가져오기
          const teacherClasses = classes.filter(c => c.homeroomTeacherId === currentUser.uid);
          if (teacherClasses.length === 0) {
            setLoading(false);
            await Swal.fire({
              title: '오류',
              text: '담당 클래스가 없습니다.',
              icon: 'error',
              customClass: {
                container: 'swal2-container-high-z'
              }
            });
            return;
          }

          // 진행 상황 표시를 위한 SweetAlert
          let progressSwal = null;
          if (studentsData.length > 5) {
            progressSwal = Swal.fire({
              title: '학생 데이터 처리 중...',
              html: `
                <div style="text-align: center;">
                  <div style="margin: 20px 0;">
                    <div class="swal2-progress-bar" style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                      <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); transition: width 0.3s ease;"></div>
                    </div>
                    <div id="progress-text" style="margin-top: 10px; font-weight: bold;">처리 중... (0/${studentsData.length})</div>
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

          // 학생 데이터 처리
          const batch = writeBatch(db);
          let successCount = 0;
          let errorCount = 0;
          const errors = [];
          
          for (let i = 0; i < studentsData.length; i++) {
            const student = studentsData[i];
            try {
              // 진행 상황 업데이트
              if (progressSwal) {
                const progress = ((i + 1) / studentsData.length) * 100;
                const progressBar = document.getElementById('progress-bar');
                const progressText = document.getElementById('progress-text');
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `처리 중... (${i + 1}/${studentsData.length})`;
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
                errors.push(`행 ${studentsData.indexOf(student) + 2}: ${name || '이름 없음'} - 필수 필드 누락 (${missingFields.join(', ')})`);
                errorCount++;
                continue;
              }
              
              // 담임교사의 클래스인지 확인
              const isMyClass = teacherClasses.some(c => c.name === className);
              if (!isMyClass) {
                errors.push(`행 ${studentsData.indexOf(student) + 2}: ${name} - 담당하지 않는 클래스입니다 (${className})`);
                errorCount++;
                continue;
              }
              
              // 학년, 반, 번호 유효성 검사
              const gradeNum = parseInt(grade);
              const classNum = parseInt(classNumber);
              const studentNum = parseInt(studentNumber);
              
              if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
                errors.push(`행 ${studentsData.indexOf(student) + 2}: ${name} - 학년이 올바르지 않습니다 (${grade})`);
                errorCount++;
                continue;
              }
              
              if (isNaN(classNum) || classNum < 1 || classNum > 20) {
                errors.push(`행 ${studentsData.indexOf(student) + 2}: ${name} - 반이 올바르지 않습니다 (${classNumber})`);
                errorCount++;
                continue;
              }
              
              if (isNaN(studentNum) || studentNum < 1 || studentNum > 500) {
                errors.push(`행 ${i + 2}: ${name} - 번호가 올바르지 않습니다 (${studentNumber})`);
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
              
              // 클래스 ID 찾기
              const classId = teacherClasses.find(c => c.name === className)?.id;
              
              const studentRef = doc(collection(db, 'accounts'));
              batch.set(studentRef, {
                name: name,
                studentId: studentId,
                grade: gradeNum,
                class: classNum,
                number: studentNum,
                birthDate: birthDate || '',
                homeroomTeacher: currentUser.name,
                homeroomTeacherId: currentUser.uid,
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
              console.error('학생 데이터 처리 오류:', error);
              errors.push(`행 ${i + 2}: ${student['이름'] || '이름 없음'} - ${error.message}`);
              errorCount++;
            }
          }
          
          // 진행 상황 창 닫기
          if (progressSwal) {
            await Swal.close();
          }
          
          await batch.commit();
          setLoading(false);
          
          // 데이터 새로고침
          await fetchStudents();
          await fetchPendingRequests();
          await fetchMeritRecords();
          await fetchResetRequests();
          await fetchInquiries();
          
          await logSystemAction(
            currentUser,
            LOG_CATEGORIES.STUDENT_MANAGEMENT.middle.CREATE,
            '학생 일괄 생성',
            `${successCount}명의 학생이 일괄 생성되었습니다. (오류: ${errorCount}건)`
          );
          
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
              text: `${successCount}명의 학생이 추가되었습니다.`,
              icon: 'success',
              customClass: {
                container: 'swal2-container-high-z'
              }
            });
          }
        } catch (error) {
          console.error('XLSX 파일 처리 오류:', error);
          setLoading(false);
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
      console.error('XLSX 업로드 오류:', error);
      setLoading(false);
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

  const handleViewStudentDetails = async (student) => {
    setSelectedStudent(student);
    setShowStudentDetailsDialog(true);
    
    try {
      await logMeritAction(
        currentUser,
        LOG_CATEGORIES.MERIT_MANAGEMENT.middle.VIEW,
        `학생 상벌점 상세 조회`,
        `학생: ${student.name} (${student.studentId})`
      );
    } catch (error) {
      console.error('로그 기록 오류:', error);
    }
  };

  const handleAddMerit = async () => {
    try {
      if (!meritForm.studentId) {
        await Swal.fire({
          title: '오류',
          text: '학생을 선택해주세요.',
          icon: 'error'
        });
        return;
      }

      if (!meritForm.reason) {
        await Swal.fire({
          title: '오류',
          text: '사유를 선택해주세요.',
          icon: 'error'
        });
        return;
      }

      // 선택된 학생 정보 가져오기
      const selectedStudentData = students.find(student => student.id === meritForm.studentId);
      if (!selectedStudentData) {
        await Swal.fire({
          title: '오류',
          text: '선택된 학생 정보를 찾을 수 없습니다.',
          icon: 'error'
        });
        return;
      }

      const meritData = {
        ...meritForm,
        creatorId: currentUser.uid,
        creatorRole: currentUser.role,
        status: 'approved',
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        changeHistory: [{
          changedBy: currentUser.uid,
          changedAt: new Date(),
          oldValue: null,
          newValue: meritForm.value,
          oldReason: null,
          newReason: meritForm.reason
        }]
      };
      
      await addDoc(collection(db, 'merit_demerit_records'), meritData);
      
      const logData = {
        studentId: meritForm.studentId,
        studentName: selectedStudentData.name,
        studentGrade: selectedStudentData.grade,
        studentClass: selectedStudentData.class,
        type: meritForm.type,
        value: meritForm.value,
        reason: meritForm.reason,
        description: meritForm.description || meritForm.reason,
        teacherId: currentUser.uid,
        teacherName: currentUser.name,
        teacherRole: currentUser.role,
        action: '상벌점 추가',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'merit_demerit_records'), logData);
      
      const studentRef = doc(db, 'accounts', meritForm.studentId);
      const studentDoc = await getDoc(studentRef);
      if (studentDoc.exists()) {
        const currentScore = studentDoc.data().cumulativeScore || 0;
        const newScore = meritForm.type === 'merit' 
          ? currentScore + meritForm.value 
          : currentScore - meritForm.value;
        
        await updateDoc(studentRef, {
          cumulativeScore: newScore,
          updatedAt: new Date()
        });
      }
      
      try {
        await addDoc(collection(db, 'system_logs'), {
          userId: currentUser.uid,
          userName: currentUser.name || currentUser.email,
          userRole: currentUser.role,
          majorCategory: '상벌점 관리',
          middleCategory: '상벌점 생성',
          minorCategory: '',
          action: '상벌점 추가',
          details: `${currentUser.name || currentUser.email}님이 ${meritForm.type === 'merit' ? '상점' : '벌점'} ${meritForm.value}점을 추가했습니다.`,
          timestamp: new Date(),
          createdAt: new Date()
        });
          } catch (logError) {
    }
      
      // 모달창을 먼저 닫고 SweetAlert 표시
      setShowMeritDialog(false);
      setMeritForm({ studentId: '', type: 'demerit', reason: '', value: 1, description: '' });
      
      // 데이터 새로고침
      await fetchMeritRecords();
      
      // 성공 메시지 표시
      await Swal.fire({
        title: '성공',
        text: '상벌점이 성공적으로 추가되었습니다!',
        icon: 'success'
      });
    } catch (error) {
      // 모달창을 먼저 닫고 에러 메시지 표시
      setShowMeritDialog(false);
      
      await Swal.fire({
        title: '오류',
        text: '상벌점 추가 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
  };



  const handleRequestResponse = async (requestId, status, note = '') => {
    try {
      await logMeritAction(
        currentUser,
        LOG_CATEGORIES.MERIT_MANAGEMENT.middle.PROCESS,
        `상벌점 요청 ${status === 'approved' ? '승인' : '거부'}`,
        `요청 ID: ${requestId}`
      );

      // 요청 상태 업데이트
      const meritRequestRef = doc(db, 'merit_demerit_requests', requestId);
      await updateDoc(meritRequestRef, {
        status: status,
        responseAt: new Date(),
        responseNote: status === 'approved' ? '담임 교사 승인' : '담임 교사 거부'
      });

      // 시스템 로그 추가
      try {
        await addDoc(collection(db, 'system_logs'), {
          userId: currentUser.uid,
          userName: currentUser.name || currentUser.email,
          userRole: currentUser.role,
          majorCategory: '상벌점 관리',
          middleCategory: '상벌점 요청 처리',
          minorCategory: '',
          action: `상벌점 요청 ${status === 'approved' ? '승인' : '거부'}`,
          details: `${currentUser.name || currentUser.email}님이 ${selectedRequest?.studentName || '학생'}의 상벌점 요청을 ${status === 'approved' ? '승인' : '거부'}했습니다. (요청 교사: ${selectedRequest?.requestingTeacherName || '교과목 교사'})`,
          timestamp: new Date(),
          createdAt: new Date()
        });
      } catch (logError) {
        console.error('시스템 로그 기록 오류:', logError);
      }

      if (status === 'approved' && selectedRequest) {
        const meritData = {
          studentId: selectedRequest.studentId,
          type: selectedRequest.type,
          reason: selectedRequest.reason,
          value: selectedRequest.value,
          description: selectedRequest.description || selectedRequest.reason,
          creatorId: selectedRequest.requestingTeacherId,
          creatorRole: 'subject_teacher',
          status: 'approved',
          requestTeacherId: selectedRequest.requestingTeacherId,
          createdAt: new Date(), // 현재 날짜로 고정
          updatedAt: new Date(),
          changeHistory: [{
            changedBy: currentUser.uid,
            changedAt: new Date(),
            oldValue: null,
            newValue: selectedRequest.value,
            oldReason: null,
            newReason: selectedRequest.reason
          }]
        };
        
        await addDoc(collection(db, 'merit_demerit_records'), meritData);
        
        const logData = {
          studentId: selectedRequest.studentId,
          studentName: selectedRequest.studentName,
          studentGrade: selectedRequest.studentGrade,
          studentClass: selectedRequest.studentClass,
          type: selectedRequest.type,
          value: selectedRequest.value,
          reason: selectedRequest.reason,
          description: selectedRequest.description || selectedRequest.reason,
          teacherId: selectedRequest.requestingTeacherId,
          teacherName: selectedRequest.requestingTeacherName,
          teacherRole: selectedRequest.requestingTeacherRole,
          action: '상벌점 요청 승인',
          approvedBy: currentUser.uid,
          approvedByName: currentUser.name,
          createdAt: new Date(), // 현재 날짜로 고정
          approvedAt: new Date(),
          updatedAt: new Date()
        };
        
        await addDoc(collection(db, 'merit_demerit_records'), logData);
        
        const studentRef = doc(db, 'accounts', selectedRequest.studentId);
        const studentDoc = await getDoc(studentRef);
        if (studentDoc.exists()) {
          const currentScore = studentDoc.data().cumulativeScore || 0;
          const newScore = selectedRequest.type === 'merit' 
            ? currentScore + selectedRequest.value 
            : currentScore - selectedRequest.value;
          
          await updateDoc(studentRef, {
            cumulativeScore: newScore,
            updatedAt: new Date()
          });
        }
      }

      setShowRequestDialog(false);
      setSelectedRequest(null);
      
      // 데이터 새로고침
      await fetchPendingRequests();
      await fetchStudents();
      await fetchMeritRecords();
      
      await Swal.fire({
        title: '처리 완료',
        text: `요청이 ${status === 'approved' ? '승인' : '거부'}되었습니다.`,
        icon: status === 'approved' ? 'success' : 'info'
      });
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '요청 처리 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
  };

  const handleResetRequest = async (requestId, approved) => {
    try {
      const requestRef = doc(db, 'reset_requests', requestId);
      
      if (approved) {
        await updateDoc(requestRef, {
          status: 'approved',
          approvedAt: new Date()
        });
        
        const allRequestsRef = collection(db, 'reset_requests');
        const q = query(
          allRequestsRef,
          where('adminId', '==', resetRequests[0].adminId),
          where('status', 'in', ['pending', 'approved'])
        );
        const snapshot = await getDocs(q);
        const allRequests = snapshot.docs.map(doc => doc.data());
        
        if (allRequests.every(req => req.status === 'approved')) {
          await executeFullReset(allRequests[0].adminId);
        }
        
        await Swal.fire({
          title: '승인 완료',
          text: '초기화 요청을 승인했습니다.',
          icon: 'success'
        });
      } else {
        await updateDoc(requestRef, {
          status: 'rejected',
          rejectedAt: new Date()
        });
        await Swal.fire({
          title: '거부 완료',
          text: '초기화 요청을 거부했습니다.',
          icon: 'info'
        });
      }
      
      await fetchResetRequests();
    } catch (error) {
      await Swal.fire({
        title: '오류',
        text: '초기화 요청 처리 중 오류가 발생했습니다: ' + error.message,
        icon: 'error'
      });
    }
  };

  const executeFullReset = async (adminId) => {
    try {
      const batch = writeBatch(db);
      
      const studentsRef = collection(db, 'accounts');
      const studentsQuery = query(studentsRef, where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      studentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const teachersRef = collection(db, 'accounts');
      const teachersQuery = query(teachersRef, where('role', 'in', ['homeroom_teacher', 'subject_teacher']));
      const teachersSnapshot = await getDocs(teachersQuery);
      teachersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const classesRef = collection(db, 'classes');
      const classesSnapshot = await getDocs(classesRef);
      classesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const recordsRef = collection(db, 'merit_demerit_records');
      const recordsSnapshot = await getDocs(recordsRef);
      recordsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const requestsRef = collection(db, 'merit_demerit_requests');
      const requestsSnapshot = await getDocs(requestsRef);
      requestsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const resetRequestsRef = collection(db, 'reset_requests');
      const resetSnapshot = await getDocs(resetRequestsRef);
      resetSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      setStudents([]);
      setPendingRequests([]);
      setMeritRecords([]);
      setResetRequests([]);
      
      alert('전체 초기화가 완료되었습니다. 모든 데이터가 삭제되었습니다.');
    } catch (error) {
      alert('전체 초기화 중 오류가 발생했습니다: ' + error.message);
    }
  };


  const formatDate = (date) => {
    if (!date) return '-';
    
    // Firestore Timestamp 객체인 경우 toDate()로 변환
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // 이미 Date 객체인 경우
    if (date instanceof Date) {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // 문자열이나 숫자인 경우
    try {
      return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '날짜 오류';
    }
  };

  const getTypeColor = (type) => {
    return type === 'merit' ? 'success' : 'error';
  };

  const getTypeIcon = (type) => {
    return type === 'merit' ? <AddIcon /> : <RemoveIcon />;
  };

  if (!currentUser || currentUser.role !== 'homeroom_teacher') {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6">데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

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

  // 모든 해상도에서 PC UI 유지 (사이드바 레이아웃) - 최고관리자와 동일한 구조
    return (
    <Box sx={{ display: 'flex', minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
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
            담임교사 대시보드
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
            {[
              { text: '학생 관리', icon: <GroupIcon />, value: 0 },
              { text: '승인 대기', icon: <RequestIcon />, value: 1 },
              { text: '상벌점 기록', icon: <AssessmentIcon />, value: 2 },
            { text: '학년 관리', icon: <GroupIcon />, value: 3 },
            ].map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                onClick={() => {
                  setTabValue(item.value);
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
            {resetRequests.length > 0 && (
              <Box sx={{ position: 'relative', mb: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<WarningIcon />}
                  onClick={() => setShowResetDialog(true)}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  초기화 동의
                </Button>
                <Badge 
                  badgeContent={resetRequests.length} 
                  color="error" 
                  sx={{ 
                    position: 'absolute',
                    top: -8,
                    right: -8
                  }}
                />
              </Box>
            )}
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

        {/* 메인 콘텐츠 */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 3, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%'
        }}>
          {/* 헤더 */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 4, 
            width: '100%',
            maxWidth: '100%'
          }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
            {currentUser.name}선생님
            </Typography>
          </Box>

          {/* 통계 카드 */}
          <Grid container spacing={3} sx={{ mb: 4, width: '100%', maxWidth: '100%' }}>
            <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', display: 'flex' }}>
              <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <GroupIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">{students.length}</Typography>
                <Typography variant="body1" color="text.secondary">담당 학생 수</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', display: 'flex' }}>
              <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <RequestIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h4">{homeroomTeacherCounts.requestedToMe}</Typography>
                <Typography variant="body1" color="text.secondary">대기 중인 요청</Typography>
                </CardContent>
              </Card>
            </Grid>
        
          </Grid>

          {/* 탭 콘텐츠 */}
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
          {tabValue === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>학생 관리</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table sx={{ tableLayout: 'auto' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                          onClick={() => handleSort('name')}
                        >
                          이름 {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        {!isMobileOrSmaller && (
                          <>
                            <TableCell>학년</TableCell>
                            <TableCell>반</TableCell>
                          </>
                        )}
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                          onClick={() => handleSort('studentId')}
                        >
                          학번 {sortConfig.key === 'studentId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                          onClick={() => handleSort('cumulativeScore')}
                        >
                          상벌점 {sortConfig.key === 'cumulativeScore' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>상벌점 등록</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.name}</TableCell>
                          {!isMobileOrSmaller && (
                            <>
                              <TableCell>{student.grade}</TableCell>
                              <TableCell>{student.class}</TableCell>
                            </>
                          )}
                          <TableCell>{student.studentId || student.id}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${student.cumulativeScore || 0}점`}
                              color={student.cumulativeScore > 0 ? 'success' : student.cumulativeScore < 0 ? 'error' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowMeritDialog(true);
                                }}
                              >
                                상벌점 등록
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={async () => {
                                  const history = await fetchStudentMeritHistory(student.id);
                                  setSelectedStudentForHistory({ ...student, meritHistory: history });
                                  setShowStudentMeritHistoryDialog(true);
                                }}
                              >
                                자세히
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
            </Box>
              </CardContent>
            </Card>
          )}

          {tabValue === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>승인 대기</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>학생</TableCell>
                        <TableCell>요청자</TableCell>
                        <TableCell>점수</TableCell>
                        <TableCell>사유</TableCell>
                        <TableCell>상세설명</TableCell>
                        <TableCell>요청일</TableCell>
                        <TableCell>액션</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingRequests.map((request) => (
                          <TableRow key={request.id}>
                          <TableCell>{request.studentName}</TableCell>
                          <TableCell>{request.requesterName}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${request.points > 0 ? '+' : ''}${request.points}`}
                              color={request.points > 0 ? 'success' : 'error'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                            <TableCell>{request.reason}</TableCell>
                          <TableCell>{request.description || ''}</TableCell>
                          <TableCell>
                            {request.createdAt?.toLocaleString?.('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) || 'N/A'}
                          </TableCell>
                            <TableCell>
                            <Button
                              variant="contained"
                                color="success"
                                size="small"
                              onClick={() => handleApproveRequest(request.id)}
                              sx={{ mr: 1 }}
                            >
                              승인
                            </Button>
                            <Button
                              variant="contained"
                                color="error"
                              size="small"
                              onClick={() => handleRejectRequest(request.id)}
                              >
                              거부
                            </Button>
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
            </Box>
              </CardContent>
            </Card>
          )}

          {tabValue === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>상벌점 기록</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleMeritSort('studentName')}
                        >
                          학생 {meritSortConfig.key === 'studentName' && (meritSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleMeritSort('points')}
                        >
                          점수 {meritSortConfig.key === 'points' && (meritSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleMeritSort('reason')}
                        >
                          사유 {meritSortConfig.key === 'reason' && (meritSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell>상세설명</TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleMeritSort('requesterName')}
                        >
                          요청자 {meritSortConfig.key === 'requesterName' && (meritSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell 
                          sx={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleMeritSort('createdAt')}
                        >
                          승인일 {meritSortConfig.key === 'createdAt' && (meritSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {meritRecords.map((record) => (
                          <TableRow key={record.id}>
                          <TableCell>{record.studentName}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${record.points > 0 ? '+' : ''}${record.points}`}
                              color={record.points > 0 ? 'success' : 'error'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                            <TableCell>{record.reason}</TableCell>
                            <TableCell>{record.description || ''}</TableCell>
                          <TableCell>{record.requesterName}</TableCell>
                          <TableCell>
                            {record.approvedAt?.toDate?.()?.toLocaleString?.('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            }) || record.createdAt?.toLocaleString?.('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            }) || 'N/A'}
                          </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
            </Box>
              </CardContent>
            </Card>
          )}

          {tabValue === 3 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>학년 관리</Typography>
                
                {/* 학년 관리 하위 탭 */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  <Tabs value={gradeTabValue} onChange={(e, newValue) => setGradeTabValue(newValue)}>
                    <Tab label="학생 목록" />
                    <Tab label="요청 내역" />
                  </Tabs>
                </Box>
                
                {/* 학생 목록 탭 */}
                {gradeTabValue === 0 && (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      같은 학년 학생 목록
                    </Typography>
                    
                    {/* 검색 입력 필드 */}
                    <Box sx={{ mb: 3 }}>
                      <TextField
                        fullWidth
                        placeholder="학생 이름, 학번, 담임교사로 검색..."
                        value={gradeSearchTerm}
                        onChange={(e) => setGradeSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                          endAdornment: gradeSearchTerm && (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setGradeSearchTerm('')}
                              >
                                <ClearIcon />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        sx={{ maxWidth: 400 }}
                      />
                    </Box>
                    
                    {gradeStudents.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          같은 학년의 다른 반 학생이 없습니다.
                        </Typography>
                      </Box>
                    ) : filteredGradeStudents.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          검색 결과가 없습니다.
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ overflowX: 'auto' }}>
                        <Table sx={{ 
                          tableLayout: 'fixed',
                          minWidth: isMobileOrSmaller ? '600px' : '100%'
                        }}>
                          <TableHead>
                            <TableRow>
                              <TableCell 
                                sx={{ 
                                  cursor: 'pointer', 
                                  userSelect: 'none', 
                                  whiteSpace: 'nowrap',
                                  width: isMobileOrSmaller ? '80px' : '100px'
                                }}
                                onClick={() => handleGradeStudentSort('studentId')}
                              >
                                학번 {gradeStudentSortConfig.key === 'studentId' && (gradeStudentSortConfig.direction === 'asc' ? '↑' : '↓')}
                              </TableCell>
                              <TableCell 
                                sx={{ 
                                  cursor: 'pointer', 
                                  userSelect: 'none', 
                                  whiteSpace: 'nowrap',
                                  width: isMobileOrSmaller ? '80px' : '100px'
                                }}
                                onClick={() => handleGradeStudentSort('name')}
                              >
                                이름 {gradeStudentSortConfig.key === 'name' && (gradeStudentSortConfig.direction === 'asc' ? '↑' : '↓')}
                              </TableCell>
                              <TableCell sx={{ 
                                whiteSpace: 'nowrap',
                                width: isMobileOrSmaller ? '100px' : '120px'
                              }}>
                                학년/반/번호
                              </TableCell>
                              <TableCell 
            sx={{
                                  cursor: 'pointer', 
                                  userSelect: 'none', 
                                  whiteSpace: 'nowrap',
                                  width: isMobileOrSmaller ? '120px' : '150px'
                                }}
                                onClick={() => handleGradeStudentSort('homeroomTeacher')}
                              >
                                담임교사 {gradeStudentSortConfig.key === 'homeroomTeacher' && (gradeStudentSortConfig.direction === 'asc' ? '↑' : '↓')}
                              </TableCell>
                              <TableCell sx={{ 
                                whiteSpace: 'nowrap',
                                width: isMobileOrSmaller ? '80px' : '100px'
                              }}>
                                누계 점수
                              </TableCell>
                              <TableCell sx={{ 
                                whiteSpace: 'nowrap',
                                width: isMobileOrSmaller ? '100px' : '120px'
                              }}>
                                작업
                              </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                            {filteredGradeStudents.map((student) => (
                      <TableRow key={student.id}>
                                <TableCell>{student.studentId || student.id}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>
                                  {student.grade}학년 {student.class}반 {student.number}번
                        </TableCell>
                                <TableCell>
                                  {getHomeroomTeacherDisplay(student)}
                        </TableCell>
                          <TableCell>
                            <Chip
                                    label={`${student.cumulativeScore || 0}점`}
                                    color={student.cumulativeScore > 0 ? 'success' : student.cumulativeScore < 0 ? 'error' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                                    variant="outlined"
                              size="small"
                                    onClick={() => handleGradeMeritRequest(student)}
                                    startIcon={<AddIcon />}
                                  >
                                    상벌점 요청
                            </Button>
                          </TableCell>
                        </TableRow>
                            ))}
                  </TableBody>
                </Table>
          </Box>
        )}
            </Box>
                )}
                
                {/* 요청 내역 탭 */}
                {gradeTabValue === 1 && (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      학년 관리 요청 내역
                    </Typography>
                    
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table sx={{ tableLayout: 'auto' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                              onClick={() => handleGradeRequestSort('studentName')}
                      >
                              학생 {gradeRequestSortConfig.key === 'studentName' && (gradeRequestSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                              onClick={() => handleGradeRequestSort('requesterName')}
                      >
                              요청자 {gradeRequestSortConfig.key === 'requesterName' && (gradeRequestSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                              onClick={() => handleGradeRequestSort('requestContent')}
                      >
                              요청 내용 {gradeRequestSortConfig.key === 'requestContent' && (gradeRequestSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell 
                              sx={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                              onClick={() => handleGradeRequestSort('createdAt')}
                      >
                              요청일 {gradeRequestSortConfig.key === 'createdAt' && (gradeRequestSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                          {sortedGradeRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>{request.studentName}</TableCell>
                              <TableCell>{request.requesterName}</TableCell>
                              <TableCell>{request.requestContent}</TableCell>
                              <TableCell>{request.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</TableCell>
                          <TableCell>
              <Button
                variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={() => handleApproveGradeRequest(request.id)}
                                  sx={{ mr: 1 }}
                                >
                                  승인
              </Button>
                            <Button
                                  variant="contained"
                                  color="error"
                              size="small"
                                  onClick={() => handleRejectGradeRequest(request.id)}
                                >
                                  거부
                            </Button>
                          </TableCell>
                        </TableRow>
                          ))}
                  </TableBody>
                </Table>
                    </Box>
          </Box>
        )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* 다이얼로그들 */}
      {/* 상벌점 등록 다이얼로그 */}
      <Dialog open={showMeritDialog} onClose={() => setShowMeritDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>상벌점 등록</DialogTitle>
          <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>학생</InputLabel>
                  <Select
                  value={selectedStudent ? selectedStudent.id : ''}
                  onChange={(e) => setSelectedStudent(students.find(s => s.id === e.target.value))}
                  label="학생"
                  >
                    {students.map(student => (
                      <MenuItem key={student.id} value={student.id}>
                        {student.name} ({student.studentId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>구분</InputLabel>
                  <Select
                  value={meritForm.type || 'demerit'}
                    onChange={(e) => setMeritForm({...meritForm, type: e.target.value})}
                  label="구분"
                  >
                    <MenuItem value="merit">상점</MenuItem>
                    <MenuItem value="demerit">벌점</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="점수"
                  type="number"
                value={meritForm.value || 1}
                  onChange={(e) => setMeritForm({...meritForm, value: parseInt(e.target.value)})}
                  inputProps={{ min: 1 }}
                required
                />
              </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                  <InputLabel>사유</InputLabel>
                  <Select
                  value={meritForm.reason || ''}
                    onChange={(e) => setMeritForm({...meritForm, reason: e.target.value})}
                  label="사유"
                >
                  {meritReasons
                    .filter(reason => reason.type === meritForm.type)
                    .map((reason) => (
                      <MenuItem key={reason.id} value={reason.reason}>
                        {reason.reason}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="상세 내용"
                  multiline
                  rows={3}
                value={meritForm.description || ''}
                  onChange={(e) => setMeritForm({...meritForm, description: e.target.value})}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowMeritDialog(false)}>취소</Button>
          <Button onClick={handleMeritSubmit} variant="contained">등록</Button>
          </DialogActions>
        </Dialog>

      {/* 상벌점 요청 다이얼로그 */}
      <Dialog open={showRequestDialog} onClose={() => setShowRequestDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>상벌점 요청</DialogTitle>
          <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                <InputLabel>학생</InputLabel>
                  <Select
                  value={selectedStudent ? selectedStudent.id : ''}
                  onChange={(e) => setSelectedStudent(students.find(s => s.id === e.target.value))}
                  label="학생"
                >
                  {students.map(student => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.name} ({student.studentId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>구분</InputLabel>
                <Select
                  value={meritForm.type || 'demerit'}
                  onChange={(e) => setMeritForm({...meritForm, type: e.target.value})}
                  label="구분"
                >
                  <MenuItem value="merit">상점</MenuItem>
                  <MenuItem value="demerit">벌점</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                label="점수"
                type="number"
                value={meritForm.value || 1}
                onChange={(e) => setMeritForm({...meritForm, value: parseInt(e.target.value)})}
                inputProps={{ min: 1 }}
                required
                />
              </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>사유</InputLabel>
                <Select
                  value={meritForm.reason || ''}
                  onChange={(e) => setMeritForm({...meritForm, reason: e.target.value})}
                  label="사유"
                >
                  {meritReasons
                    .filter(reason => reason.type === meritForm.type)
                    .map((reason) => (
                      <MenuItem key={reason.id} value={reason.reason}>
                        {reason.reason}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                label="상세 내용"
                  multiline
                rows={3}
                value={meritForm.description || ''}
                onChange={(e) => setMeritForm({...meritForm, description: e.target.value})}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
          <Button onClick={() => setShowRequestDialog(false)}>취소</Button>
          <Button onClick={() => {
            // 상벌점 요청 로직
            console.log('상벌점 요청:', meritForm);
            setShowRequestDialog(false);
          }} variant="contained">요청</Button>
          </DialogActions>
        </Dialog>

      {/* 학년 관리 상벌점 요청 다이얼로그 */}
      <Dialog open={showGradeMeritDialog} onClose={() => setShowGradeMeritDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>상벌점 요청</DialogTitle>
          <DialogContent>
          {selectedGradeStudent && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                  학생 정보
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                  <strong>이름:</strong> {selectedGradeStudent.name}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                  <strong>학년/반/번호:</strong> {selectedGradeStudent.grade}학년 {selectedGradeStudent.class}반 {selectedGradeStudent.number}번
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                  <strong>담임교사:</strong> {getHomeroomTeacherDisplay(selectedGradeStudent)}
                    </Typography>
                  </Grid>
                  
                    <Grid item xs={12}>
                <Divider />
                    </Grid>

                  <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  상벌점 정보
                    </Typography>
                  </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>상벌점 유형</InputLabel>
                  <Select
                    value={gradeMeritForm.type}
                    onChange={(e) => setGradeMeritForm({...gradeMeritForm, type: e.target.value, reason: ''})}
                    label="상벌점 유형"
                  >
                    <MenuItem value="merit">상점</MenuItem>
                    <MenuItem value="demerit">벌점</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                  label="점수"
                  type="number"
                  value={gradeMeritForm.points}
                  onChange={(e) => setGradeMeritForm({...gradeMeritForm, points: e.target.value})}
                    required
                  placeholder="점수를 입력하세요"
                  />
                </Grid>
              
                <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>사유</InputLabel>
                  <Select
                    value={gradeMeritForm.reason}
                    onChange={(e) => setGradeMeritForm({...gradeMeritForm, reason: e.target.value})}
                    label="사유"
                  >
                    {meritReasons
                      .filter(reason => reason.type === gradeMeritForm.type)
                      .map((reason) => (
                        <MenuItem key={reason.id} value={reason.reason}>
                          {reason.reason}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                </Grid>
              
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                  label="상세 설명"
                  value={gradeMeritForm.description}
                  onChange={(e) => setGradeMeritForm({...gradeMeritForm, description: e.target.value})}
                  multiline
                  rows={4}
                  placeholder="상세한 설명을 입력하세요 (선택사항)"
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
          <Button onClick={() => setShowGradeMeritDialog(false)}>취소</Button>
          <Button onClick={handleGradeMeritSubmit} variant="contained">요청 전송</Button>
          </DialogActions>
        </Dialog>

      {/* 학생 상벌점 기록 다이얼로그 */}
      <Dialog open={showStudentMeritHistoryDialog} onClose={() => setShowStudentMeritHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          학생 상세 정보
        </DialogTitle>
          <DialogContent>
          {selectedStudentForHistory && (
              <Box sx={{ mt: 2 }}>
              {/* 학생 기본 정보 */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  학생 정보
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>이름:</strong> {selectedStudentForHistory.name}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>학번:</strong> {selectedStudentForHistory.studentId || selectedStudentForHistory.id}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>학년/반/번호:</strong> {selectedStudentForHistory.grade}학년 {selectedStudentForHistory.class}반 {selectedStudentForHistory.number}번
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>생년월일:</strong> {selectedStudentForHistory.birthDate || 'N/A'}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>누적 점수:</strong> {selectedStudentForHistory.cumulativeScore || 0}점
                </Typography>
              </Box>

              {/* 상벌점 기록 섹션 */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  상벌점 기록
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedStudent(selectedStudentForHistory);
                    setShowStudentMeritHistoryDialog(false);
                    setShowMeritDialog(true);
                  }}
                >
                  상벌점 추가
                </Button>
              </Box>

              {selectedStudentForHistory?.meritHistory && selectedStudentForHistory.meritHistory.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>날짜</TableCell>
                      <TableCell>구분</TableCell>
                      <TableCell>점수</TableCell>
                      <TableCell>사유</TableCell>
                      <TableCell>상세 내용</TableCell>
                      <TableCell>처리 교사</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedStudentForHistory.meritHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {record.createdAt?.toLocaleString?.('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.type === 'merit' ? '상점' : '벌점'}
                            color={record.type === 'merit' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${record.points || 0}점`}
                            color={record.points > 0 ? 'success' : record.points < 0 ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{record.reason || 'N/A'}</TableCell>
                        <TableCell>{record.description || ''}</TableCell>
                        <TableCell>
                          {record.processedTeacherName || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    상벌점 기록이 없습니다.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          </DialogContent>
          <DialogActions>
          <Button onClick={() => setShowStudentMeritHistoryDialog(false)}>닫기</Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
}
export default HomeroomTeacherDashboard;
