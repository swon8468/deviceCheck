import React, { createContext, useContext, useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 학생 로그인 (기존 방식 유지)
  const loginStudent = async (name, birthDate, studentId) => {
    try {
      
      // studentId 필드로 학생 검색
      const studentsRef = collection(db, 'accounts');
      const q = query(
        studentsRef, 
        where('role', '==', 'student'),
        where('studentId', '==', studentId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();
        
        if (studentData.name === name && studentData.birthDate === birthDate) {
          setCurrentUser({ ...studentData, id: studentDoc.id });
          setUserRole('student');
          return { success: true };
        }
      }
      return { success: false, error: '학생 정보가 일치하지 않습니다.' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // 교사/관리자 로그인 (Firebase Authentication 사용)
  const loginTeacher = async (email, password) => {
    try {
      
      // Firebase Authentication으로 로그인
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Firestore에서 사용자 정보 조회
      const userRef = doc(db, 'accounts', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // 계정이 비활성화되었는지 확인
        if (userData.status === 'disabled') {
          // 비활성화된 계정이므로 로그아웃 처리
          await signOut(auth);
          return { 
            success: false, 
            error: `계정이 비활성화되었습니다. 사유: ${userData.disabledReason || '관리자에 의해 비활성화됨'}` 
          };
        }
        
        // 계정이 삭제되었는지 확인
        if (userData.status === 'deleted') {
          // 삭제된 계정이므로 로그아웃 처리
          await signOut(auth);
          return { 
            success: false, 
            error: `계정이 삭제되었습니다. 관리자에게 문의하세요.` 
          };
        }
        
        const user = { ...userData, uid: result.user.uid };
        setCurrentUser(user);
        setUserRole(userData.role);
        
        // 로그인 성공 로그 기록
        try {
          await addDoc(collection(db, 'system_logs'), {
            userId: user.uid,
            userName: user.name || user.email,
            userRole: user.role,
            majorCategory: '시스템',
            middleCategory: '로그인',
            minorCategory: '',
            action: '로그인 성공',
            details: `${user.name || user.email}님이 로그인했습니다.`,
            timestamp: new Date(),
            createdAt: new Date()
          });
        } catch (logError) {
          // 로그 기록 오류 무시
        }
        
        return { success: true };
      } else {
        return { success: false, error: '사용자 정보를 찾을 수 없습니다. Firestore에 계정 정보가 등록되지 않았습니다.' };
      }
    } catch (error) {
      
      // Firebase Auth 에러 코드별 메시지
      let errorMessage = '로그인에 실패했습니다.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = '등록되지 않은 이메일입니다.';
          break;
        case 'auth/wrong-password':
          errorMessage = '비밀번호가 올바르지 않습니다.';
          break;
        case 'auth/invalid-email':
          errorMessage = '올바르지 않은 이메일 형식입니다.';
          break;
        case 'auth/too-many-requests':
          errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
          break;
        default:
          errorMessage = error.message;
      }
      
      // 로그인 실패 로그 기록
      try {
        await addDoc(collection(db, 'system_logs'), {
          userId: 'unknown',
          userName: email,
          userRole: 'unknown',
          majorCategory: '시스템',
          middleCategory: '로그인',
          minorCategory: '',
          action: '로그인 실패',
          details: `${email}로 로그인 시도 실패: ${errorMessage}`,
          timestamp: new Date(),
          createdAt: new Date()
        });
      } catch (logError) {
        // 로그 기록 오류 무시
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // 관리자 계정 복원 (교사 계정 생성 후 사용)
  const restoreAdminAccount = async (adminUid) => {
    try {
      const adminRef = doc(db, 'accounts', adminUid);
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        const adminData = adminSnap.data();
        setCurrentUser({ ...adminData, uid: adminUid });
        setUserRole(adminData.role);
        return { success: true };
      } else {
        return { success: false, error: '관리자 계정 정보를 찾을 수 없습니다.' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      // 로그아웃 전에 현재 사용자 정보 저장
      const currentUserData = currentUser;
      
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      
      // 로그아웃 로그 기록
      if (currentUserData) {
        try {
          await addDoc(collection(db, 'system_logs'), {
            userId: currentUserData.uid,
            userName: currentUserData.name || currentUserData.email,
            userRole: currentUserData.role,
            majorCategory: '시스템',
            middleCategory: '로그아웃',
            minorCategory: '',
            action: '로그아웃',
            details: `${currentUserData.name || currentUserData.email}님이 로그아웃했습니다.`,
            timestamp: new Date(),
            createdAt: new Date()
          });
        } catch (logError) {
          // 로그 기록 오류 무시
        }
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    // 타임아웃 설정 (10초 후에도 로딩이 완료되지 않으면 강제로 로딩 종료)
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      
      try {
      if (user) {
          // Firebase Auth 사용자인 경우 (교사/관리자)
          const userRef = doc(db, 'accounts', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // 계정이 비활성화되었는지 확인
            if (userData.status === 'disabled') {
              // 비활성화된 계정이므로 로그아웃 처리
              await signOut(auth);
              setCurrentUser(null);
              setUserRole(null);
              setLoading(false);
              clearTimeout(timeoutId);
              return;
            }
            
            setCurrentUser({ ...userData, uid: user.uid });
            setUserRole(userData.role);
          } else {
            setCurrentUser(null);
            setUserRole(null);
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
        }
      } catch (error) {
        setCurrentUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const value = {
    currentUser,
    userRole,
    loginStudent,
    loginTeacher,
    restoreAdminAccount,
    logout,
    loading
  };



  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            width: '100vw'
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
