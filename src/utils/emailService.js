import { getAuth, sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth';

// 비밀번호 재설정 이메일 발송
export const sendPasswordResetEmail = async (email) => {
  try {
    const auth = getAuth();
    
    // Firebase Auth를 통해 비밀번호 재설정 이메일 발송
    await firebaseSendPasswordResetEmail(auth, email);
    
    return {
      success: true,
      message: '비밀번호 재설정 이메일이 발송되었습니다.'
    };
  } catch (error) {
    return {
      success: false,
      message: `이메일 발송 실패: ${error.message}`
    };
  }
};

// 사용자 이메일 검증 (Firestore에서 확인)
export const verifyUserEmail = async (email) => {
  try {
    // Firestore에서 사용자 확인
    const { db } = await import('../firebase/config');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const usersRef = collection(db, 'accounts');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        success: false,
        message: '해당 이메일로 등록된 사용자가 없습니다.'
      };
    }
    
    return {
      success: true,
      user: querySnapshot.docs[0].data()
    };
  } catch (error) {
    return {
      success: false,
      message: `사용자 검증 실패: ${error.message}`
    };
  }
};
