import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

export const logAction = async (logData) => {
  try {
    // super_admin 계정의 로그는 기록하지 않음
    if (logData.userRole === 'super_admin') {
      return;
    }
    
    const logEntry = {
      ...logData,
      timestamp: new Date(),
      createdAt: new Date()
    };
    
    await addDoc(collection(db, 'system_logs'), logEntry);
  } catch (error) {
    console.error('로그 기록 오류:', error);
  }
};

// 로그 카테고리 상수
export const LOG_CATEGORIES = {
  USER_MANAGEMENT: {
    major: '사용자 관리',
    middle: {
      TEACHER: '교사 관리',
      STUDENT: '학생 관리',
      AUTH: '인증 관리',
      CREATE: '사용자 생성',
      UPDATE: '사용자 수정',
      DELETE: '사용자 삭제',
      ROLE_CHANGE: '역할 변경',
      STATUS_CHANGE: '상태 변경'
    }
  },
  CLASS_MANAGEMENT: {
    major: '클래스 관리',
    middle: {
      CREATE: '클래스 생성',
      UPDATE: '클래스 수정',
      DELETE: '클래스 삭제',
      ASSIGN: '교사 배정',
      VIEW: '클래스 조회',
      DETAILS: '클래스 상세 조회'
    }
  },
  STUDENT_MANAGEMENT: {
    major: '학생 관리',
    middle: {
      CREATE: '학생 생성',
      UPDATE: '학생 수정',
      DELETE: '학생 삭제',
      CSV: 'CSV 업로드',
      XLSX: 'XLSX 업로드',
      BULK_CREATE: '일괄 생성',
      BULK_UPDATE: '일괄 수정',
      BULK_DELETE: '일괄 삭제',
      VIEW: '학생 조회',
      DETAILS: '학생 상세 조회',
      HISTORY: '학생 이력 조회'
    }
  },
  MERIT_MANAGEMENT: {
    major: '상벌점 관리',
    middle: {
      CREATE: '상벌점 생성',
      APPROVE: '상벌점 승인',
      REJECT: '상벌점 거부',
      REQUEST: '상벌점 요청',
      PROCESS: '상벌점 요청 처리',
      VIEW: '상벌점 조회',
      HISTORY: '상벌점 이력 조회',
      REASON_ADD: '상벌점 사유 추가',
      REASON_UPDATE: '상벌점 사유 수정',
      REASON_DELETE: '상벌점 사유 삭제',
      BULK_PROCESS: '상벌점 일괄 처리'
    }
  },
  SYSTEM: {
    major: '시스템',
    middle: {
      LOGIN: '로그인',
      LOGOUT: '로그아웃',
      RESET: '데이터 초기화',
      EXPORT: '데이터 내보내기',
      IMPORT: '데이터 가져오기',
      DASHBOARD_VIEW: '대시보드 조회',
      RESET_APPROVAL: '초기화 승인',
      ERROR: '시스템 오류',
      WARNING: '시스템 경고',
      INFO: '시스템 정보',
      MAINTENANCE: '시스템 유지보수'
    }
  },
  DATA_MANAGEMENT: {
    major: '데이터 관리',
    middle: {
      BACKUP: '데이터 백업',
      RESTORE: '데이터 복원',
      OVERWRITE: '데이터 덮어쓰기',
      EXPORT: '데이터 내보내기',
      IMPORT: '데이터 가져오기',
      VALIDATION: '데이터 검증',
      CLEANUP: '데이터 정리',
      MIGRATION: '데이터 마이그레이션'
    }
  },
  SECURITY: {
    major: '보안',
    middle: {
      LOGIN_ATTEMPT: '로그인 시도',
      LOGIN_SUCCESS: '로그인 성공',
      LOGIN_FAILED: '로그인 실패',
      PERMISSION_DENIED: '권한 거부',
      SUSPICIOUS_ACTIVITY: '의심스러운 활동',
      PASSWORD_CHANGE: '비밀번호 변경',
      ACCOUNT_LOCKED: '계정 잠금',
      ACCOUNT_UNLOCKED: '계정 잠금 해제'
    }
  },
  AUDIT: {
    major: '감사',
    middle: {
      DATA_ACCESS: '데이터 접근',
      DATA_MODIFICATION: '데이터 수정',
      CONFIGURATION_CHANGE: '설정 변경',
      POLICY_CHANGE: '정책 변경',
      COMPLIANCE_CHECK: '규정 준수 확인'
    }
  }
};

// 로그 생성 헬퍼 함수들
export const logUserAction = (user, action, details, minorCategory = '') => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.USER_MANAGEMENT.major,
    middleCategory: action,
    minorCategory,
    action: details,
    details: `${user.name || user.email}님이 ${details}`
  });
};

export const logClassAction = (user, action, details, minorCategory = '') => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.CLASS_MANAGEMENT.major,
    middleCategory: action,
    minorCategory,
    action: details,
    details: `${user.name || user.email}님이 ${details}`
  });
};

export const logStudentAction = (user, action, details, minorCategory = '') => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.STUDENT_MANAGEMENT.major,
    middleCategory: action,
    minorCategory,
    action: details,
    details: `${user.name || user.email}님이 ${details}`
  });
};

export const logMeritAction = (user, action, details, minorCategory = '') => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.MERIT_MANAGEMENT.major,
    middleCategory: action,
    minorCategory,
    action: details,
    details: `${user.name || user.email}님이 ${details}`
  });
};

export const logSystemAction = (user, action, details, minorCategory = '') => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.SYSTEM.major,
    middleCategory: action,
    minorCategory,
    action: details,
    details: `${user.name || user.email}님이 ${details}`
  });
};

export const logDataAction = (user, action, details, minorCategory = '') => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.DATA_MANAGEMENT.major,
    middleCategory: action,
    minorCategory,
    action: details,
    details: `${user.name || user.email}님이 ${details}`
  });
};

export const logSecurityAction = (user, action, details, minorCategory = '') => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.SECURITY.major,
    middleCategory: action,
    minorCategory,
    action: details,
    details: `${user.name || user.email}님이 ${details}`
  });
};

export const logAuditAction = (user, action, details, minorCategory = '') => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.AUDIT.major,
    middleCategory: action,
    minorCategory,
    action: details,
    details: `${user.name || user.email}님이 ${details}`
  });
};

// 상세한 로그를 위한 고급 로그 함수
export const logDetailedAction = (user, majorCategory, middleCategory, action, details, additionalData = {}) => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userEmail: user.email,
    userRole: user.role,
    majorCategory,
    middleCategory,
    action,
    details,
    additionalData,
    ipAddress: additionalData.ipAddress || 'N/A',
    userAgent: additionalData.userAgent || 'N/A',
    sessionId: additionalData.sessionId || 'N/A',
    timestamp: new Date(),
    createdAt: new Date()
  });
};

// 오류 로그 전용 함수
export const logError = (user, error, context = '', additionalData = {}) => {
  return logAction({
    userId: user?.uid || 'system',
    userName: user?.name || user?.email || 'system',
    userRole: user?.role || 'system',
    majorCategory: LOG_CATEGORIES.SYSTEM.major,
    middleCategory: LOG_CATEGORIES.SYSTEM.middle.ERROR,
    action: '시스템 오류 발생',
    details: `오류: ${error.message}, 컨텍스트: ${context}`,
    errorStack: error.stack,
    errorCode: error.code,
    additionalData,
    timestamp: new Date(),
    createdAt: new Date()
  });
};

// 성능 로그 전용 함수
export const logPerformance = (user, operation, duration, additionalData = {}) => {
  return logAction({
    userId: user.uid,
    userName: user.name || user.email,
    userRole: user.role,
    majorCategory: LOG_CATEGORIES.SYSTEM.major,
    middleCategory: LOG_CATEGORIES.SYSTEM.middle.INFO,
    action: '성능 측정',
    details: `작업: ${operation}, 소요시간: ${duration}ms`,
    operation,
    duration,
    additionalData,
    timestamp: new Date(),
    createdAt: new Date()
  });
};
