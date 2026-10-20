// ===== 동기화 설정 =====
// Firebase 웹 설정값은 원래 공개되는 값이에요(비밀번호 아님). 보안은 데이터베이스 규칙(rules.json)이 지켜요.
// 실제 값 입력 완료
export const firebaseConfig = {
  apiKey: 'AIzaSyCnQlhhMcIrrn9ApzsDZrxKqpldSmQhi_0',                 
  authDomain: 'whale-books.firebaseapp.com',
  databaseURL: 'https://whale-books-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'whale-books',
  storageBucket: 'whale-books.firebasestorage.app',
  messagingSenderId: '530157614206',    
  appId: '1:530157614206:web:aace6b0e8b100c5cc8142f',                   
};
export const FIREBASE_DB_URL = firebaseConfig.databaseURL;
// 데이터 경로. 로그인한(허용 목록의) 구글 계정만 읽고 쓸 수 있어요.
export const DATA_PATH = 'families/whalehome';
export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
export const firebaseReady = () => !/REPLACE_ME/.test(firebaseConfig.apiKey + firebaseConfig.appId);
