# 🐳 고래 책방 — 설치 & 동기화 설정

## 1. 앱 올리기 (무료, GitHub Pages)
1. github.com 로그인 → New repository → 이름 `whale-books`, **Public** → Create
2. "uploading an existing file" 클릭 → 이 폴더(app) 안의 파일 전부 끌어다 놓기 → Commit
3. Settings → Pages → Branch: `main` / `(root)` → Save
4. 1~2분 뒤 주소: `https://<아이디>.github.io/whale-books/`
   (Netlify Drop https://app.netlify.com/drop 에 폴더를 끌어다 놓는 방법도 가능)

## 2. 기기에 설치
- 아이패드(Safari): 주소 열기 → 공유 버튼 → **홈 화면에 추가**
- 안드로이드(Chrome): 주소 열기 → ⋮ 메뉴 → **앱 설치 / 홈 화면에 추가**

## 3. 기기 간 동기화 (Firebase 무료, 약 5분)
1. https://console.firebase.google.com → 프로젝트 추가(이름 아무거나, 애널리틱스 끔)
2. 왼쪽 메뉴 빌드 → **Realtime Database** → 데이터베이스 만들기 → 위치 선택 → **테스트 모드로 시작**
3. 규칙(Rules) 탭에 아래를 붙여넣고 게시 (테스트모드 30일 만료 방지):
```
{ "rules": { "families": { "$code": { ".read": true, ".write": true } } } }
```
4. 데이터 탭 위쪽의 주소(`https://....firebasedatabase.app` 또는 `...firebaseio.com`) 복사
5. 각 기기 앱에서 ⚙️ → **가족 코드**(예: `yu-whale-83915`, 길고 남이 모르게)와 **주소** 입력 → 저장 후 동기화
   - 모든 기기에 같은 코드/주소를 넣으면 끝! (또는 `config.js`의 FIREBASE_DB_URL에 주소를 넣어 올리면 코드만 입력)
- 인터넷이 없어도 기기에 저장되고, 연결되면 자동으로 합쳐집니다(20초마다/앱 열 때).
- 주의: 가족 코드를 아는 사람은 기록을 볼 수 있어요(책 목록·메달 기록뿐, 개인정보 없음).

## 사용법
- 📄 PDF 불러오기 → 미리보기에서 확인/수정 → 가져오기 (대분류 = 파일명, 중분류 = PDF 안 제목/학년)
- 스탬프 누를 때마다 ⭐ → 🥉 → 🥈 → 🥇 → 처음으로. 메달 올린 날은 출석부에 출석+권수로 표시
- ✏️ 로 책 수정/삭제, 대분류·중분류 추가/이름변경/삭제, ⚙️ 에서 백업 저장/불러오기
