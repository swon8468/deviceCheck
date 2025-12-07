const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const XLSX = require("xlsx");
const logger = require("firebase-functions/logger");

// Firebase Admin 초기화
initializeApp();
const db = getFirestore();

// 이메일 설정 (Gmail SMTP 사용)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // 환경변수에서 이메일 주소
    pass: process.env.EMAIL_PASS, // 환경변수에서 앱 비밀번호
  },
});

// 매일 오후 10시에 실행되는 스케줄러 함수
exports.dailyStudentReport = onSchedule({
  schedule: "0 22 * * *", // 매일 오후 10시 (UTC 기준)
  timeZone: "Asia/Seoul", // 한국 시간대
  memory: "1GiB",
  timeoutSeconds: 540,
}, async () => {
  logger.info("일일 학생 상벌점 리포트 생성 시작");
  
  try {
    // 모든 담임교사 조회
    const teachersSnapshot = await db.collection("accounts")
      .where("role", "==", "homeroom_teacher")
      .get();
    
    if (teachersSnapshot.empty) {
      logger.info("담임교사가 없습니다.");
      return;
    }
    
    // 각 담임교사별로 리포트 생성 및 전송
    for (const teacherDoc of teachersSnapshot.docs) {
      const teacherData = teacherDoc.data();
      const teacherId = teacherDoc.id;
      
      try {
        await generateAndSendReport(teacherId, teacherData);
        logger.info(`담임교사 ${teacherData.name}에게 리포트 전송 완료`);
      } catch (error) {
        logger.error(`담임교사 ${teacherData.name} 리포트 전송 실패:`, error);
      }
    }
    
    logger.info("모든 담임교사에게 일일 리포트 전송 완료");
  } catch (error) {
    logger.error("일일 리포트 생성 중 오류 발생:", error);
  }
});

// 담임교사별 리포트 생성 및 전송 함수
async function generateAndSendReport(teacherId, teacherData) {
  // 담임교사의 담당 클래스 조회
  const classesSnapshot = await db.collection("classes")
    .where("homeroom_teacher_id", "==", teacherId)
    .get();
  
  if (classesSnapshot.empty) {
    logger.info(`담임교사 ${teacherData.name}의 담당 클래스가 없습니다.`);
    return;
  }
  
  const classData = classesSnapshot.docs[0].data();
  const className = classData.name;
  
  // 해당 클래스의 모든 학생 조회
  const studentsSnapshot = await db.collection("accounts")
    .where("role", "==", "student")
    .where("class", "==", className)
    .get();
  
  if (studentsSnapshot.empty) {
    logger.info(`클래스 ${className}에 학생이 없습니다.`);
    return;
  }
  
  // 각 학생의 상벌점 내역 조회 및 데이터 준비
  const reportData = [];
  
  for (const studentDoc of studentsSnapshot.docs) {
    const studentData = studentDoc.data();
    
    // 학생의 상벌점 기록 조회 (최근 30일)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const meritRecordsSnapshot = await db.collection("merit_demerit_records")
      .where("studentId", "==", studentDoc.id)
      .where("createdAt", ">=", thirtyDaysAgo)
      .orderBy("createdAt", "desc")
      .get();
    
    // 상벌점 내역 문자열 생성
    const meritHistory = meritRecordsSnapshot.docs.map(doc => {
      const record = doc.data();
      const date = record.createdAt.toDate().toLocaleDateString("ko-KR");
      const type = record.type === "merit" ? "상점" : "벌점";
      const points = record.points || record.value || 0;
      const reason = record.reason || record.description || "";
      return `${date}: ${type} ${points}점 (${reason})`;
    }).join("\n");
    
    reportData.push({
      "학번": studentData.studentId || studentData.id || "",
      "이름": studentData.name || "",
      "생년월일": studentData.birthDate || studentData.birthday || "",
      "누계점수": studentData.totalMeritPoints || 0,
      "최근상벌점내역": meritHistory || "없음"
    });
  }
  
  // XLSX 파일 생성
  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "학생상벌점내역");
  
  const excelBuffer = XLSX.write(workbook, {type: "buffer", bookType: "xlsx"});
  
  // 이메일 전송
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: teacherData.email,
    subject: `[${className}] 일일 학생 상벌점 내역 - ${new Date().toLocaleDateString("ko-KR")}`,
    html: `
      <h2>${className} 일일 학생 상벌점 내역</h2>
      <p>안녕하세요, ${teacherData.name} 선생님.</p>
      <p>${new Date().toLocaleDateString("ko-KR")} 기준으로 우리반 학생들의 상벌점 내역을 첨부파일로 보내드립니다.</p>
      <p>첨부된 엑셀 파일에는 다음 정보가 포함되어 있습니다:</p>
      <ul>
        <li>학번, 이름, 생년월일</li>
        <li>누계 상벌점 점수</li>
        <li>최근 30일간의 상벌점 내역</li>
      </ul>
      <p>감사합니다.</p>
    `,
    attachments: [
      {
        filename: `${className}_학생상벌점내역_${new Date().toISOString().split('T')[0]}.xlsx`,
        content: excelBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    ]
  };
  
  await transporter.sendMail(mailOptions);
}

// 테스트용 함수 - 수동으로 이메일 발송 테스트
exports.testEmail = onRequest(async (req, res) => {
  logger.info("테스트 이메일 발송 시작");
  
  try {
    // 테스트 데이터 생성
    const testData = [
      {
        "학번": "2024001",
        "이름": "김학생",
        "생년월일": "2005-03-15",
        "누계점수": 15,
        "최근상벌점내역": "2024-01-15: 상점 5점 (수업 참여도 우수)\n2024-01-14: 벌점 2점 (지각)"
      },
      {
        "학번": "2024002", 
        "이름": "이학생",
        "생년월일": "2005-07-22",
        "누계점수": 8,
        "최근상벌점내역": "2024-01-15: 상점 3점 (과제 완성도 우수)"
      }
    ];
    
    // XLSX 파일 생성
    const worksheet = XLSX.utils.json_to_sheet(testData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "학생상벌점내역");
    
    const excelBuffer = XLSX.write(workbook, {type: "buffer", bookType: "xlsx"});
    
    // 이메일 전송
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "swon8468@gmail.com",
      subject: `[테스트] 2학년 7반 일일 학생 상벌점 내역 - ${new Date().toLocaleDateString("ko-KR")}`,
      html: `
        <h2>2학년 7반 일일 학생 상벌점 내역 (테스트)</h2>
        <p>안녕하세요, 테스트 담임교사님.</p>
        <p>${new Date().toLocaleDateString("ko-KR")} 기준으로 우리반 학생들의 상벌점 내역을 첨부파일로 보내드립니다.</p>
        <p>첨부된 엑셀 파일에는 다음 정보가 포함되어 있습니다:</p>
        <ul>
          <li>학번, 이름, 생년월일</li>
          <li>누계 상벌점 점수</li>
          <li>최근 30일간의 상벌점 내역</li>
        </ul>
        <p>이것은 테스트 이메일입니다.</p>
      `,
      attachments: [
        {
          filename: `2학년7반_학생상벌점내역_테스트_${new Date().toISOString().split('T')[0]}.xlsx`,
          content: excelBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      ]
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({
      success: true,
      message: "테스트 이메일이 성공적으로 발송되었습니다.",
      recipient: "swon8468@gmail.com"
    });
    
    logger.info("테스트 이메일 발송 완료");
  } catch (error) {
    logger.error("테스트 이메일 발송 실패:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
