# 새학기 시작 기능 최종 구현 계획

## 1. 데이터 구조

### 1.1 상벌점 기록에 학기/년도 필드 추가
```javascript
// merit_demerit_records
{
  academicYear: "2025",
  semester: "2", // "1" 또는 "2"
  // ... 기존 필드
}
```

### 1.2 학생 이력 컬렉션
```javascript
// student_history
{
  studentId: "student123",
  academicYear: "2025",
  semester: "2",
  grade: 1,
  class: 4,
  number: 5,
  studentNumber: "10405",
  homeroomTeacherId: "teacher123",
  startDate: "2025-09-01",
  endDate: "2026-02-28",
  createdAt: "2025-09-01"
}
```

### 1.3 클래스 이력 컬렉션
```javascript
// class_history
{
  classId: "class_original_id",
  academicYear: "2025",
  semester: "2",
  grade: 1,
  class: 1,
  name: "1학년 1반",
  homeroomTeacherId: "teacher123",
  homeroomTeacherName: "김선생",
  studentCount: 25,
  startDate: "2025-09-01",
  endDate: "2026-02-28",
  createdAt: "2025-09-01"
}
```

### 1.4 학기 설정 컬렉션
```javascript
// academic_settings
{
  id: "current",
  currentAcademicYear: "2025",
  currentSemester: "2",
  semester1Start: "2025-03-01",
  semester1End: "2025-08-31",
  semester2Start: "2025-09-01",
  semester2End: "2026-02-28",
  updatedAt: "2025-09-01",
  updatedBy: "admin123"
}
```

### 1.5 학생 계정 업데이트
```javascript
// accounts (학생)
{
  currentAcademicYear: "2025",
  currentSemester: "2",
  grade: 2, // 새 학년
  class: 3, // 새 반
  number: 7, // 새 번호
  studentNumber: "20307", // 새 학번
  status: "active" // 또는 "transferred" (전출)
}
```

## 2. 새학번 파싱 로직

```javascript
// 새학번 형식: ABCDE (5자리)
// A: 학년 (1~6)
// BC: 반 (01~20, 2자리)
// DE: 번호 (01~40, 2자리)

function parseStudentNumber(studentNumber) {
  const numStr = String(studentNumber).padStart(5, '0');
  
  if (numStr.length !== 5) {
    throw new Error('학번은 5자리여야 합니다.');
  }
  
  const grade = parseInt(numStr[0]);
  const classNum = parseInt(numStr.substring(1, 3));
  const number = parseInt(numStr.substring(3, 5));
  
  // 유효성 검증
  if (grade < 1 || grade > 6) {
    throw new Error('학년은 1~6 사이여야 합니다.');
  }
  if (classNum < 1 || classNum > 20) {
    throw new Error('반은 1~20 사이여야 합니다.');
  }
  if (number < 1 || number > 40) {
    throw new Error('번호는 1~40 사이여야 합니다.');
  }
  
  return { grade, class: classNum, number };
}
```

## 3. 학년도/학기 자동 계산

```javascript
function getCurrentAcademicYearAndSemester() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1~12
  
  if (month >= 3 && month <= 8) {
    // 3~8월: 해당 년도의 1학기
    return { academicYear: year.toString(), semester: "1" };
  } else if (month >= 9) {
    // 9~12월: 해당 년도의 2학기
    return { academicYear: year.toString(), semester: "2" };
  } else {
    // 1~2월: 전년도의 2학기
    return { academicYear: (year - 1).toString(), semester: "2" };
  }
}
```

## 4. XLSX 파일 구조

### 4.1 다운로드 파일 (기존 학생)
```
| uid       | 이름   | 현재학번 | 새학번 |
|-----------|--------|----------|--------|
| student123| 홍길동 | 10405    | 20307  |
| student456| 김철수 | 20512    | 30115  |
```

### 4.2 업로드 파일 (신규 학생 포함)
```
| uid       | 이름   | 현재학번 | 새학번 |
|-----------|--------|----------|--------|
| student123| 홍길동 | 10405    | 20307  | (기존)
|           | 이영희 |          | 20408  | (신규)
```

## 5. 검증 규칙

1. **필수 필드 확인**
   - 기존 학생: uid, 이름, 현재학번, 새학번 모두 필수
   - 신규 학생: 이름, 새학번 필수

2. **학번 형식 검증**
   - 새학번은 반드시 5자리 숫자
   - 파싱 가능한 형식 (A-BC-DE)

3. **학번 중복 확인**
   - 새학번이 다른 학생과 중복되지 않아야 함

4. **uid/이름 일치 확인**
   - 다운로드된 XLSX의 uid와 이름이 변경되지 않아야 함
   - Firestore의 기존 데이터와 일치해야 함

5. **학번 유효성**
   - 학년: 1~6
   - 반: 1~20
   - 번호: 1~40

## 6. 프로세스 흐름

### 6.1 새학기 시작 버튼 클릭
1. 현재 학년도/학기 정보 표시
2. 전환할 학기 선택 (1학기 → 2학기 또는 2학기 → 1학기)
3. "학생 정보 다운로드" 버튼

### 6.2 XLSX 다운로드
1. 모든 활성 학생 조회 (`status: 'active'`)
2. uid, 이름, 현재학번 추출
3. XLSX 파일 생성 및 다운로드

### 6.3 XLSX 업로드 및 검증
1. 파일 읽기
2. 각 행 검증:
   - 필수 필드 확인
   - 학번 형식 검증
   - uid/이름 일치 확인 (기존 학생)
   - 학번 중복 확인
3. 검증 실패 시 전체 중단 및 오류 메시지 표시

### 6.4 데이터 업데이트 (트랜잭션)
1. 현재 학생 정보를 `student_history`에 저장
2. 현재 클래스 정보를 `class_history`에 저장
3. 전출 학생 처리 (XLSX에 없는 학생 → `status: 'transferred'`)
4. 신규 학생 등록 (XLSX에 uid 없는 학생)
5. 기존 학생 정보 업데이트 (새 학년/반/번호)
6. 새 클래스 자동 생성
7. `academic_settings` 업데이트

### 6.5 담임교사 할당 모달
1. 생성된 클래스 목록 표시
2. 각 클래스마다 담임교사 선택 드롭다운
3. 담임교사가 없으면 "새로 생성" 옵션
4. 일괄 저장

## 7. 전출 학생 처리

```javascript
// XLSX에 없는 학생 처리
async function handleTransferredStudents(existingStudentIds, uploadedStudentIds) {
  const transferredIds = existingStudentIds.filter(id => !uploadedStudentIds.includes(id));
  
  const batch = writeBatch(db);
  transferredIds.forEach(studentId => {
    const studentRef = doc(db, 'accounts', studentId);
    batch.update(studentRef, {
      status: 'transferred',
      transferredAt: new Date(),
      updatedAt: new Date()
    });
    
    // student_history에 전출 기록 추가
    const historyRef = doc(collection(db, 'student_history'));
    batch.set(historyRef, {
      studentId: studentId,
      academicYear: currentAcademicYear,
      semester: currentSemester,
      status: 'transferred',
      transferredAt: new Date(),
      createdAt: new Date()
    });
  });
  
  await batch.commit();
}
```

## 8. 신규 학생 등록

```javascript
async function createNewStudent(name, newStudentNumber) {
  const { grade, class: classNum, number } = parseStudentNumber(newStudentNumber);
  
  // uid 자동 생성 (또는 다른 방식)
  const newUid = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const studentData = {
    uid: newUid,
    name: name,
    email: '', // 나중에 설정
    role: 'student',
    grade: grade,
    class: classNum,
    number: number,
    studentNumber: newStudentNumber,
    currentAcademicYear: currentAcademicYear,
    currentSemester: currentSemester,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await addDoc(collection(db, 'accounts'), studentData);
  return newUid;
}
```

## 9. 클래스 자동 생성

```javascript
async function createClassesFromStudentNumbers(students) {
  const classMap = new Map(); // { "grade-class": [students] }
  
  // 학생들을 학년-반별로 그룹화
  students.forEach(student => {
    const { grade, class: classNum } = parseStudentNumber(student.newStudentNumber);
    const key = `${grade}-${classNum}`;
    
    if (!classMap.has(key)) {
      classMap.set(key, []);
    }
    classMap.get(key).push(student);
  });
  
  // 각 그룹에 대해 클래스 생성
  const batch = writeBatch(db);
  const createdClasses = [];
  
  classMap.forEach((students, key) => {
    const [grade, classNum] = key.split('-').map(Number);
    const classId = `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const classData = {
      id: classId,
      grade: grade,
      class: classNum,
      name: `${grade}학년 ${classNum}반`,
      academicYear: currentAcademicYear,
      semester: currentSemester,
      homeroomTeacherId: null, // 나중에 할당
      homeroomTeacherName: null,
      studentCount: students.length,
      students: students.map(s => s.uid),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const classRef = doc(db, 'classes', classId);
    batch.set(classRef, classData);
    createdClasses.push(classData);
  });
  
  await batch.commit();
  return createdClasses;
}
```

## 10. 담임교사 할당 모달

**UI 구조:**
```
┌─────────────────────────────────────┐
│ 담임교사 할당                       │
├─────────────────────────────────────┤
│ 생성된 클래스: 15개                 │
│                                     │
│ 2학년 1반 (25명)                    │
│ 담임교사: [선택 ▼] [새로 생성]      │
│                                     │
│ 2학년 2반 (23명)                    │
│ 담임교사: [선택 ▼] [새로 생성]      │
│                                     │
│ ...                                 │
│                                     │
│ [취소] [저장]                       │
└─────────────────────────────────────┘
```

**담임교사 생성 모달:**
```
┌─────────────────────────────────────┐
│ 담임교사 생성                       │
├─────────────────────────────────────┤
│ 이름: [________]                    │
│ 이메일: [________]                  │
│ 전화번호: [________]                │
│                                     │
│ [취소] [생성]                       │
└─────────────────────────────────────┘
```

## 11. 마이그레이션 스크립트

```javascript
// migrateToSemesterSystem.js
// 최고 관리자만 실행 가능, 1회만 실행

async function migrateExistingData() {
  const currentYear = "2025";
  const currentSemester = "2";
  
  // 1. 모든 상벌점 기록에 학년도/학기 추가
  const recordsRef = collection(db, 'merit_demerit_records');
  const recordsSnapshot = await getDocs(recordsRef);
  const batch1 = writeBatch(db);
  
  recordsSnapshot.forEach((doc) => {
    batch1.update(doc.ref, {
      academicYear: currentYear,
      semester: currentSemester
    });
  });
  await batch1.commit();
  
  // 2. 모든 학생 계정에 현재 학기 정보 추가
  const studentsRef = collection(db, 'accounts');
  const studentsQuery = query(studentsRef, where('role', '==', 'student'));
  const studentsSnapshot = await getDocs(studentsQuery);
  const batch2 = writeBatch(db);
  
  studentsSnapshot.forEach((doc) => {
    const data = doc.data();
    batch2.update(doc.ref, {
      currentAcademicYear: currentYear,
      currentSemester: currentSemester
    });
    
    // student_history에 초기 데이터 추가
    addDoc(collection(db, 'student_history'), {
      studentId: doc.id,
      academicYear: currentYear,
      semester: currentSemester,
      grade: data.grade || 1,
      class: data.class || 1,
      number: data.number || 1,
      studentNumber: data.studentNumber || '',
      homeroomTeacherId: data.homeroomTeacherId || null,
      startDate: new Date(),
      endDate: null,
      createdAt: new Date()
    });
  });
  await batch2.commit();
  
  // 3. 현재 클래스 정보를 class_history에 저장
  const classesRef = collection(db, 'classes');
  const classesSnapshot = await getDocs(classesRef);
  
  classesSnapshot.forEach(async (doc) => {
    const classData = doc.data();
    await addDoc(collection(db, 'class_history'), {
      classId: doc.id,
      academicYear: currentYear,
      semester: currentSemester,
      grade: classData.grade,
      class: classData.class,
      name: classData.name,
      homeroomTeacherId: classData.homeroomTeacherId || null,
      homeroomTeacherName: classData.homeroomTeacherName || null,
      studentCount: classData.students?.length || 0,
      startDate: new Date(),
      endDate: null,
      createdAt: new Date()
    });
  });
  
  // 4. academic_settings 생성
  await setDoc(doc(db, 'academic_settings', 'current'), {
    currentAcademicYear: currentYear,
    currentSemester: currentSemester,
    semester1Start: `${currentYear}-03-01`,
    semester1End: `${currentYear}-08-31`,
    semester2Start: `${currentYear}-09-01`,
    semester2End: `${parseInt(currentYear) + 1}-02-28`,
    updatedAt: new Date(),
    updatedBy: currentUser.uid
  });
}
```

## 12. 구현 순서

1. **데이터 구조 확장**
   - 컬렉션에 학년도/학기 필드 추가
   - student_history, class_history 컬렉션 생성

2. **마이그레이션 스크립트 작성**
   - 기존 데이터를 2025년 2학기로 설정

3. **XLSX 다운로드 기능**
   - 현재 학생 정보 추출 및 다운로드

4. **XLSX 업로드 및 검증**
   - 파일 읽기
   - 검증 로직 구현

5. **학적 변동 처리**
   - 이력 저장
   - 학생 정보 업데이트
   - 전출/신규 처리
   - 클래스 생성

6. **담임교사 할당 모달**
   - 클래스 목록 표시
   - 담임교사 선택/생성

7. **상벌점 기록 자동 학기 설정**
   - 새로 생성되는 기록에 자동으로 현재 학기 정보 추가

8. **조회 기능 개선**
   - 학기/년도 필터 추가
