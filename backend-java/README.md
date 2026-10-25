# Java 백엔드

Spring Boot 기반 게시판·자료실 API입니다. 프로젝트 루트의 정적 화면(`board.html`, `notice.html`, `files.html`)이 운영 API를 호출합니다.

## 실행 환경

- JDK 17 이상
- Maven 3.6 이상(또는 VS Code의 Java 확장)

## 로컬 실행

저장소 루트에서 다음 명령을 실행합니다.

```bash
cd backend-java
mvn spring-boot:run
```

서버 기본 주소는 `http://127.0.0.1:8080`입니다. VS Code에서는 `backend-java`를 열고 `src/main/java/com/codestudio/board/BoardApplication.java`를 실행해도 됩니다.

기본 설정은 H2 파일 데이터베이스를 사용하며 실행 디렉터리에 `data/board.mv.db`를 만듭니다. `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_DRIVER`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` 환경변수를 설정하면 다른 데이터베이스로 연결할 수 있습니다.

## API

### 게시판

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/posts` | 게시글 목록 (최신순, `q` 검색어·`category` 분류 필터) |
| GET | `/api/posts/{id}` | 게시글 상세 |
| POST | `/api/posts` | 게시글 등록 (`title`, `content`, `category` JSON) |
| PUT | `/api/posts/{id}` | 게시글 수정 (작성자 또는 관리자) |
| DELETE | `/api/posts/{id}` | 게시글 삭제 (작성자 또는 관리자, 댓글도 함께 삭제) |
| GET | `/api/posts/{id}/comments` | 댓글 목록 |
| POST | `/api/posts/{id}/comments` | 댓글 등록 (`content` JSON) |
| DELETE | `/api/posts/{id}/comments/{commentId}` | 댓글 삭제 (작성자 또는 관리자) |

글 분류(`category`)는 `공지`, `학습일지`, `질문`, `자유` 중 하나이며 비워 둘 수도 있습니다. 자유 게시판은 분류를 사용하지 않고, 공지사항 페이지는 `공지` 분류로 글을 조회·작성합니다.

### 자료실

업로드 요청은 `multipart/form-data`의 `file` 필드를 사용합니다. 파일 크기 제한은 20MB입니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/files` | 파일 목록 (`q` 검색어로 파일명·태그·작성자 필터) |
| POST | `/api/files` | 파일 업로드 (선택 `tags` 필드) |
| GET | `/api/files/{id}/download` | 파일 다운로드 (다운로드 횟수 집계) |
| GET | `/api/files/{id}/preview` | 이미지 미리보기 (SVG 제외) |
| DELETE | `/api/files/{id}` | 파일 삭제 |

### 그림판 저장

그림판 API는 PNG 이미지를 DB에 저장하며 로그인 토큰이 필요합니다. 전체 그림 저장량은 5MiB로 제한되고, 새 그림으로 용량을 넘기면 가장 오래된 그림부터 자동 삭제됩니다. 목록·불러오기·삭제는 로그인한 사용자 본인의 그림에 한정됩니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/drawings` | 내 그림 목록 (최신순) |
| POST | `/api/drawings` | PNG 그림 저장 (`multipart/form-data`, `file` 필드, 최대 5MiB) |
| GET | `/api/drawings/{id}` | 내 그림 불러오기 |
| DELETE | `/api/drawings/{id}` | 내 그림 삭제 |

### 실시간 대화

실시간 대화는 승인된 로그인 사용자만 이용할 수 있습니다. 공용방과 1:1 대화를 지원하고, 접속 상태는 WebSocket 연결로 갱신됩니다. 메시지는 DB에 저장되어 2일 후 자동 삭제됩니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/chat/users` | 승인된 사용자와 접속 상태 |
| GET | `/api/chat/messages` | 공용 대화방 최근 메시지 |
| GET | `/api/chat/messages?with={userId}` | 특정 사용자와의 1:1 대화 기록 |
| WebSocket | `/ws/chat` | 연결 후 첫 프레임에 `{ "type": "auth", "token": "로그인 토큰" }` 전송 후 메시지 송수신 |

### 온라인 틱택토

게임 제작 페이지의 온라인 틱택토는 승인된 로그인 사용자끼리 6자리 방 코드로 대전합니다. 방과 진행 상태는 DB에 저장되며, 서버 재시작 뒤 60초 안에 두 참가자가 같은 계정으로 재접속하면 이어서 플레이할 수 있습니다. 연결이 끊겨도 60초 안에 재접속하지 않으면 방을 정리합니다. 서버가 차례, 둘 수 있는 칸, 승패를 검증하며, 게임 종료 후 두 참가자가 모두 재대결을 요청하면 새 판을 시작합니다. WebSocket 연결과 방 처리는 단일 백엔드 인스턴스를 전제로 합니다. 여러 인스턴스로 확장하려면 공유 메시지 브로커와 세션 라우팅이 추가로 필요합니다.

| WebSocket | `/ws/game` | 첫 프레임에 `{ "type": "auth", "token": "로그인 토큰" }`을 전송한 뒤 `create`, `join`, `move`, `rematch`, `leave` 요청을 주고받습니다. |

### 게임 점수 랭킹

점수 게임의 최고 기록을 로그인 계정별로 저장하고 게임마다 상위 10명을 제공합니다. 기록은 갱신될 때마다 더 좋은 값만 유지되며, `order=asc`인 게임(반응 속도·지뢰 찾기 등)은 낮을수록 좋은 기록으로 다룹니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/game-scores?gameId={id}&order=asc` | 게임 기록 상위 10명과 내 최고 기록 (`order=asc`면 낮은 값이 상위) |
| POST | `/api/game-scores` | 기록 제출 (`gameId`, `score` JSON, `order`가 `asc`면 낮은 값만 갱신) |

### 소식(자동 포스팅)

`NewsCollector`가 무료 RSS·검색 피드(연합뉴스 정치·사회·증권, Google 검색 증시·금리·환율·가상자산·미국 증시·연준)를 10분마다 수집해 `news_items`에 저장합니다. 정치·사회는 `국내`, 주식·금리·환율·코인 소식은 `경제`로 분류하며, 스포츠·연예 피드는 사용하지 않습니다. 각 분류는 피드별 상한을 두어 한 주제가 목록을 독차지하지 않도록 합니다. 같은 사건을 다룬 기사가 겹치지 않도록 제목의 출처 꼬리표와 문장부호를 제거해 비교하고, 정규화한 제목이 이미 있으면 저장하지 않습니다. 기사에 이미지가 있으면 `media:content`·`enclosure`·본문 `<img>`에서 썸네일 주소를 함께 보관합니다. 같은 링크는 중복 저장하지 않고, 분류별로 최신 20건만 남기고 오래된 항목은 다음 수집 때 삭제합니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/news` | 최신 소식 20건(제목, 링크, 출처, 분류, 요약, 썸네일, 시각). 로그인 없이 조회 가능 |
| GET | `/api/news?category=경제` | 특정 분류의 최신 소식 20건만 조회 (예: `경제`). 투자정보 페이지에서 사용 |

### 투자정보(시세)

`StockQuoteService`가 네이버(국내 주식·환율), CNBC(미국 주식·ETF·금 ETF·유가), 업비트(비트코인) 시세를 받아 10초간 캐시해 제공합니다. 종목은 국내 시가총액 상위 3개(삼성전자 005930, SK하이닉스 000660, SK스퀘어 402340)와 KODEX 200(069500), 미국 시가총액 상위 3개(엔비디아 NVDA, 애플 AAPL, 알파벳 A GOOGL)와 S&P 500 ETF(SPY)·나스닥 100 ETF(QQQ), 원/달러 환율(FX_USDKRW), 비트코인(KRW-BTC), 금 ETF(GLD), WTI 유가(@CL.1)입니다. 각 행은 장전·시간외 `session`과 마지막 거래일 종가 여부를 알리는 `marketState`(`open`/`closed`)를 담아, 장이 닫힌 종목은 페이지에서 "장 마감" 배지로 표시됩니다. 일부 소스 조회가 실패하면 응답의 `partial`이 `true`가 되어 페이지에 "일부 시세 지연" 안내가 붙습니다. 서버가 시작되면(`ApplicationReadyEvent`) 백그라운드에서 시세를 미리 받아 두어, 무료 플랜의 콜드 스타트 직후에도 첫 조회가 빠릅니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/stocks` | 시세 목록(이름, 심볼, 그룹, 현재가, 등락, 통화, 장 세션·마감 여부)과 `partial`(일부 지연) 여부. 로그인 없이 조회 가능 |

### 계정과 일정

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 (`username`, `displayName`, `password`) |
| POST | `/api/auth/login` | 로그인, Bearer 토큰 발급 |
| GET | `/api/auth/me` | 현재 계정 확인 |
| POST | `/api/auth/logout` | 현재 토큰 폐기 |
| GET | `/api/admin/users/pending` | 관리자: 승인 대기 회원 목록 |
| PUT | `/api/admin/users/{id}/approval` | 관리자: 회원 승인 또는 거절 (`status`) |
| GET | `/api/events` | 내 일정 목록 |
| GET | `/api/events/export` | 내 일정을 ICS(iCalendar) 파일로 내보내기 |
| POST | `/api/events` | 일정 추가 (`repeatRule`: `none`/`daily`/`weekly`/`monthly`) |
| PUT | `/api/events/{id}` | 내 일정 수정 |
| DELETE | `/api/events/{id}` | 내 일정 삭제 |

게시판·자료실·일정 API에는 `Authorization: Bearer <token>` 헤더가 필요합니다. 회원가입은 아이디(영문 소문자·숫자·밑줄 3~30자), 표시 이름(1~30자), 비밀번호(8자 이상)를 받으며, 가입 직후 승인되어 바로 로그인할 수 있습니다. 발급 토큰은 7일 동안 유효합니다.

첫 관리자 계정은 애플리케이션 시작 시 다음 환경변수로 만듭니다. Render에서는 서비스의 **Environment** 설정에 두 값을 입력하고 재배포하세요. 관리자 비밀번호는 12자 이상이어야 하며 코드나 GitHub에 저장하지 마세요.

```text
SAP_ADMIN_USERNAME=사용할_관리자_아이디
SAP_ADMIN_PASSWORD=비공개_관리자_비밀번호
```

이후 사이트의 `로그인 / 회원가입` 화면에서 위 아이디와 비밀번호로 로그인하면 **회원가입 승인** 메뉴가 나타납니다. 새 회원은 가입 즉시 자동 승인되며, 이 메뉴는 이전에 가입한 승인 대기 회원을 관리하는 용도입니다. 로그인 상태로 좌측 메뉴의 **비밀번호 변경**을 열고 현재 비밀번호와 새 비밀번호를 입력하면 계정 비밀번호를 변경할 수 있습니다. 변경 시 기존 로그인 토큰을 모두 폐기하므로 새 비밀번호로 다시 로그인해야 합니다. Render 환경변수 `SAP_ADMIN_PASSWORD`는 관리자 계정을 처음 생성할 때 사용하는 초기값입니다. 이미 존재하는 관리자 계정의 비밀번호는 서버 재시작으로 덮어쓰지 않으며, 일반적인 비밀번호 변경은 사이트 화면에서 진행하세요. 환경변수가 설정되지 않으면 회원가입은 처리되지 않습니다.

## 저장 방식과 배포 주의사항

게시글, 계정, 인증 토큰, 일정과 자료실 파일 메타데이터·본문은 JPA를 통해 설정된 데이터베이스에 저장됩니다. 따라서 Render 서버 재시작·재배포 후에도 DB에 저장된 파일이 유지됩니다. 데이터 보존은 연결된 데이터베이스의 백업·용량 정책을 따릅니다.

### PostgreSQL 백업과 복구

다음 스크립트는 Windows PowerShell과 PostgreSQL 명령줄 도구(`pg_dump`, `pg_restore`)를 사용합니다. Render 대시보드의 PostgreSQL 연결 URL 또는 애플리케이션의 `jdbc:postgresql://...` 주소를 `SPRING_DATASOURCE_URL` 환경변수로 설정한 뒤 실행합니다. 연결 URL에는 비밀번호가 들어 있으므로 명령줄 인자, 저장소, 공유 로그에 붙여넣지 마세요.

```powershell
function Set-SecretEnvironmentVariable($name, $prompt) {
  $secret = Read-Host $prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try {
    [Environment]::SetEnvironmentVariable($name, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer), "Process")
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secret.Dispose()
  }
}
Set-SecretEnvironmentVariable "SPRING_DATASOURCE_URL" "PostgreSQL URL"
try { .\backend-java\scripts\backup-postgres.ps1 }
finally { Remove-Item Env:SPRING_DATASOURCE_URL -ErrorAction SilentlyContinue }
```

수동 백업은 `backend-java\backups`에 압축 아카이브와 SHA-256 체크섬으로 저장됩니다. 이 폴더는 Git에서 제외되지만, 개인 정보와 해시된 비밀번호가 포함될 수 있으므로 암호화된 안전한 위치에 보관하세요. 최소 주 1회 및 변경 작업 전에 백업하고, 보존 기간에 따라 오래된 사본을 안전하게 삭제하는 것을 권장합니다.

Windows PC에서 주간 백업을 예약하려면 PowerShell에서 아래 설치 스크립트를 한 번 실행하고 숨김 입력으로 DB URL을 입력합니다. 기본값은 매주 일요일 03:00, 최신 12개 보관입니다. `-DayOfWeek`, `-At`, `-RetentionCount`로 일정을 바꿀 수 있습니다.

```powershell
.\backend-java\scripts\install-backup-schedule.ps1
```

작업은 현재 Windows 사용자로 실행되며 URL은 해당 사용자 계정으로 보호(DPAPI)되어 `%LOCALAPPDATA%\SAP\PostgresBackup`에 저장됩니다. 덤프 파일도 저장소 밖 같은 경로의 `archives`에 보관됩니다. 예약 시간에 PC가 켜져 있어야 하며, 예약 작업은 설치한 사용자 계정으로 실행됩니다. 실행 결과는 작업 스케줄러에서, 실패 세부 내용은 `scheduled-backup.log`에서 확인하세요. 예약을 제거하려면 `Unregister-ScheduledTask -TaskName SAP-Postgres-Backup -Confirm:$false`를 실행하세요.

복구는 운영 DB를 직접 덮어쓰지 말고 먼저 별도의 빈 스테이징 DB에서 시험합니다. 백업 위치는 예약 여부에 따라 저장소의 `backend-java\backups` 또는 `%LOCALAPPDATA%\SAP\PostgresBackup\archives`입니다. 스테이징 DB 연결 URL을 `SAP_RESTORE_TARGET_DATABASE_URL`에 지정하면 스크립트가 체크섬을 확인하고 대상 DB 이름을 직접 입력해 확인하도록 요구합니다. 설정된 `SPRING_DATASOURCE_URL`과 같은 호스트·DB 이름으로의 복구는 차단됩니다.

```powershell
function Set-SecretEnvironmentVariable($name, $prompt) {
  $secret = Read-Host $prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try {
    [Environment]::SetEnvironmentVariable($name, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer), "Process")
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secret.Dispose()
  }
}
Set-SecretEnvironmentVariable "SPRING_DATASOURCE_URL" "운영 DB URL (대상 보호 검사)"
Set-SecretEnvironmentVariable "SAP_RESTORE_TARGET_DATABASE_URL" "빈 스테이징 PostgreSQL URL"
try {
  .\backend-java\scripts\restore-postgres.ps1 -BackupPath .\backend-java\backups\sap-postgres-YYYYMMDD-HHMMSS.dump
} finally {
  Remove-Item Env:SPRING_DATASOURCE_URL, Env:SAP_RESTORE_TARGET_DATABASE_URL -ErrorAction SilentlyContinue
}
```

스테이징에서 로그인, 게시글, 일정, 자료실 파일과 게임 진행 상태를 확인한 다음 애플리케이션의 DB 연결을 전환하세요. DB 전환 전 현재 운영 DB도 별도 백업하고, Render 요금제와 대시보드에서 자동 백업·보존 기간을 확인하세요. 자동 백업이 제공되더라도 별도 복구 시험을 대신하지는 않습니다.

## 프론트엔드 연결


저장소 루트의 `board.html`과 `files.html`에 운영 API 주소가 설정되어 있습니다. 로컬 화면에서 Java 서버를 사용하려면 해당 페이지의 `API_BASE`를 `http://127.0.0.1:8080/api/posts` 또는 `http://127.0.0.1:8080/api/files`로 바꾸세요. 브라우저 요청은 `CorsConfig`의 허용 출처 설정을 따릅니다.
