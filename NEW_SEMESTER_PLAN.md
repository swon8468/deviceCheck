# 새학기/새학년도 관리 기능 구현 계획

## 1. 데이터 구조 설계

### 1.1 상벌점 기록에 학기/년도 필드 추가
```javascript
// merit_demerit_records 컬렉션 구조
{
  id: "record123",
  studentId: "student123",
  academicYear: "2024",        // 학년도 (예: "2024", "2025")
  semester: "1",               // 학기 ("1" 또는 "2")
  points: 5,
  reason: "봉사활동",
  createdAt: "2024-03-15",
  teacherId: "teacher123",
  // ... 기타 기존 필드
}
```

### 1.2 학생 이력 관리 컬렉션 생성
```javascript
// student_history 컬렉션 (새로 생성)
{
  id: "history123",
  studentId: "student123",
  academicYear: "2024",
  semester: "1",
  grade: 1,                    // 학년
  class: 2,                    // 반
  number: 15,                  // 번호
  homeroomTeacherId: "teacher123",
  homeroomTeacherName: "김선생",
  startDate: "2024-03-01",     // 학기 시작일
  endDate: "2024-08-31",       // 학기 종료일
  createdAt: "2024-03-01",
  updatedAt: "2024-03-01"
}
```

### 1.3 학생 계정에 현재 학기 정보 추가
```javascript
// accounts 컬렉션 (기존 구조에 추가)
{
  id: "student123",
  name: "홍길동",
  currentAcademicYear: "2024",  // 현재 학년도
  currentSemester: "2",          // 현재 학기
  grade: 1,                       // 현재 학년
  class: 2,                       // 현재 반
  number: 15,                     // 현재 번호
  // ... 기타 기존 필드
}
```

### 1.4 학기 설정 컬렉션 (시스템 설정)
```javascript
// academic_settings 컬렉션 (새로 생성)
{
  id: "current",
  currentAcademicYear: "2024",
  currentSemester: "2",
  semester1Start: "2024-03-01",   // 1학기 시작일
  semester1End: "2024-08-31",     // 1학기 종료일
  semester2Start: "2024-09-01",   // 2학기 시작일
  semester2End: "2025-02-28",     // 2학기 종료일
  updatedAt: "2024-09-01",
  updatedBy: "admin123"
}
```

## 2. 기능 구현 계획

### 2.1 학기 전환 기능 (관리자 전용)

**위치**: 최고 관리자 대시보드 > 전용 기능

**기능**:
1. "새 학기 시작" 버튼
2. 학기 전환 모달:
   - 현재 학기 정보 표시
   - 전환할 학기 선택 (1학기 → 2학기 또는 2학기 → 1학기)
   - 학년 자동 증가 옵션 (체크박스)
   - 반/번호 업데이트 방법 선택:
     - 수동 입력
     - CSV 파일 업로드
   - 확인 단계: "START NEW SEMESTER" 입력 필요

**프로세스**:
1. 현재 모든 학생의 정보를 `student_history`에 저장
2. 학년 자동 증가 옵션이 체크되어 있으면 모든 학생의 학년 +1
3. CSV 업로드 또는 수동 입력으로 반/번호 업데이트
4. `academic_settings` 업데이트
5. 모든 학생의 `currentAcademicYear`, `currentSemester` 업데이트

### 2.2 조회 기능 개선

#### 2.2.1 학생 대시보드
- 기본: 현재 학기 상벌점 내역 표시
- 필터 추가:
  - 학년도 선택 드롭다운
  - 학기 선택 (1학기/2학기/전체)
  - "전체 기간" 옵션
- 탭 구성:
  - 현재 학기
  - 이전 학기
  - 전체 내역

#### 2.2.2 담임교사 대시보드
- 기본: 현재 학기 담당 학생 상벌점 내역
- 필터:
  - 학년도/학기 선택
  - 특정 학생 선택
- 통계:
  - 학기별 상벌점 통계
  - 학생별 학기별 비교

#### 2.2.3 교과목 교사 대시보드
- 요청 내역에 학기 필터 추가
- 학기별 요청 통계

#### 2.2.4 관리자 대시보드
- 전체 학기/년도 조회
- 학기별 통계 및 비교
- 학기 전환 이력 조회

### 2.3 상벌점 기록 생성 시 학기 정보 자동 추가

**자동 설정 로직**:
```javascript
// 상벌점 기록 생성 시
const getCurrentSemester = async () => {
  const settingsRef = doc(db, 'academic_settings', 'current');
  const settingsDoc = await getDoc(settingsRef);
  
  if (settingsDoc.exists()) {
    const settings = settingsDoc.data();
    const today = new Date();
    const sem1Start = new Date(settings.semester1Start);
    const sem1End = new Date(settings.semester1End);
    const sem2Start = new Date(settings.semester2Start);
    const sem2End = new Date(settings.semester2End);
    
    if (today >= sem1Start && today <= sem1End) {
      return { academicYear: settings.currentAcademicYear, semester: "1" };
    } else if (today >= sem2Start && today <= sem2End) {
      return { academicYear: settings.currentAcademicYear, semester: "2" };
    }
  }
  
  // 기본값 (설정이 없을 경우)
  return { academicYear: new Date().getFullYear().toString(), semester: "1" };
};
```

## 3. UI/UX 설계

### 3.1 학기 전환 모달
```
┌─────────────────────────────────────┐
│ 새 학기 시작                        │
├─────────────────────────────────────┤
│ 현재 학기: 2024학년도 1학기         │
│ 전환할 학기: 2024학년도 2학기        │
│                                     │
│ [✓] 학년 자동 증가                  │
│                                     │
│ 반/번호 업데이트 방법:               │
│ ( ) 수동 입력                       │
│ ( ) CSV 파일 업로드                 │
│                                     │
│ ⚠️ 이 작업은 되돌릴 수 없습니다!     │
│ 계속하려면 "START NEW SEMESTER"     │
│ 를 입력하세요.                      │
│ [________________]                  │
│                                     │
│ [취소] [전환하기]                   │
└─────────────────────────────────────┘
```

### 3.2 조회 필터 UI
```
┌─────────────────────────────────────┐
│ 학기/년도 필터                      │
├─────────────────────────────────────┤
│ 학년도: [2024 ▼]                    │
│ 학기:   [1학기 ▼]                   │
│                                     │
│ [전체 기간] [현재 학기]              │
└─────────────────────────────────────┘
```

### 3.3 학생 이력 조회 (관리자)
```
┌─────────────────────────────────────┐
│ 학생 이력                           │
├─────────────────────────────────────┤
│ 홍길동 (student123)                 │
│                                     │
│ 2024학년도 1학기                    │
│ - 1학년 2반 15번                    │
│ - 담임: 김선생                      │
│                                     │
│ 2024학년도 2학기                    │
│ - 2학년 3반 12번                    │
│ - 담임: 이선생                      │
└─────────────────────────────────────┘
```

## 4. 데이터 마이그레이션 계획

### 4.1 기존 데이터 처리
1. 모든 기존 상벌점 기록에 기본값 추가:
   - `academicYear: "2024"` (현재 년도)
   - `semester: "1"` (기본값)

2. 모든 학생 계정에 현재 학기 정보 추가:
   - `currentAcademicYear: "2024"`
   - `currentSemester: "1"`

3. 현재 학생 정보로 `student_history` 초기 데이터 생성

4. `academic_settings` 컬렉션 생성 및 초기값 설정

### 4.2 마이그레이션 스크립트
```javascript
// 마이그레이션 함수 (관리자 전용, 한 번만 실행)
const migrateToSemesterSystem = async () => {
  const currentYear = new Date().getFullYear().toString();
  
  // 1. 상벌점 기록 업데이트
  const recordsRef = collection(db, 'merit_demerit_records');
  const recordsSnapshot = await getDocs(recordsRef);
  const batch1 = writeBatch(db);
  
  recordsSnapshot.forEach((doc) => {
    batch1.update(doc.ref, {
      academicYear: currentYear,
      semester: "1"
    });
  });
  await batch1.commit();
  
  // 2. 학생 계정 업데이트
  const studentsRef = collection(db, 'accounts');
  const studentsQuery = query(studentsRef, where('role', '==', 'student'));
  const studentsSnapshot = await getDocs(studentsQuery);
  const batch2 = writeBatch(db);
  
  studentsSnapshot.forEach((doc) => {
    const data = doc.data();
    batch2.update(doc.ref, {
      currentAcademicYear: currentYear,
      currentSemester: "1"
    });
    
    // student_history에도 추가
    addDoc(collection(db, 'student_history'), {
      studentId: doc.id,
      academicYear: currentYear,
      semester: "1",
      grade: data.grade || 1,
      class: data.class || 1,
      number: data.number || 1,
      homeroomTeacherId: data.homeroomTeacherId || null,
      startDate: new Date(),
      endDate: null,
      createdAt: new Date()
    });
  });
  await batch2.commit();
  
  // 3. 학기 설정 생성
  await setDoc(doc(db, 'academic_settings', 'current'), {
    currentAcademicYear: currentYear,
    currentSemester: "1",
    semester1Start: `${currentYear}-03-01`,
    semester1End: `${currentYear}-08-31`,
    semester2Start: `${currentYear}-09-01`,
    semester2End: `${parseInt(currentYear) + 1}-02-28`,
    updatedAt: new Date(),
    updatedBy: currentUser.uid
  });
};
```

## 5. 구현 순서

1. **1단계**: 데이터 구조 확장
   - `merit_demerit_records`에 학기/년도 필드 추가
   - `student_history` 컬렉션 생성
   - `academic_settings` 컬렉션 생성
   - `accounts`에 현재 학기 정보 필드 추가

2. **2단계**: 마이그레이션 스크립트 실행
   - 기존 데이터에 기본값 부여
   - 초기 이력 데이터 생성

3. **3단계**: 상벌점 기록 생성 시 학기 정보 자동 추가
   - 모든 상벌점 등록/요청 시 현재 학기 정보 자동 설정

4. **4단계**: 조회 기능 개선
   - 각 대시보드에 학기/년도 필터 추가
   - 필터링 로직 구현

5. **5단계**: 학기 전환 기능 구현
   - 관리자 전용 학기 전환 모달
   - 자동/수동 업데이트 로직

6. **6단계**: 통계 및 리포트 기능
   - 학기별 통계
   - 비교 리포트

## 6. 보안 및 권한

- 학기 전환: 최고 관리자만 가능
- 이전 학기 데이터 수정: 불가 (조회만 가능)
- 현재 학기 데이터: 기존 권한 유지
- 학생 이력 조회: 관리자 및 담임교사만 가능

## 7. 성능 최적화

- Firestore 인덱스 생성:
  - `merit_demerit_records`: `academicYear`, `semester` 복합 인덱스
  - `student_history`: `studentId`, `academicYear`, `semester` 복합 인덱스

- 쿼리 최적화:
  - 기본 조회는 현재 학기만 조회
  - 이전 학기 조회는 필요 시에만 실행

## 8. 테스트 계획

1. 마이그레이션 테스트
2. 학기 전환 프로세스 테스트
3. 조회 필터 테스트
4. 권한 테스트
5. 성능 테스트
