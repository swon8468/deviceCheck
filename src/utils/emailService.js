import { getAuth, sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth';

export const sendPasswordResetEmail = async (email) => {
  try {
    const auth = getAuth();
    
    

    await firebaseSendPasswordResetEmail(auth, email);
    
    return {
      success: true,
      message: '비밀번호 재설정 이메일이 발송되었습니다.'
    };
  } catch (error) {
    console.error('비밀번호 재설정 이메일 발송 오류:', error);
    return {
      success: false,
      message: `이메일 발송 실패: ${error.message}`
    };
  }
};

export const verifyUserEmail = async (email) => {
  try {
    

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
    console.error('사용자 검증 오류:', error);
    return {
      success: false,
      message: `사용자 검증 실패: ${error.message}`
    };
  }
};
