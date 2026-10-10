# Java 백엔드

Spring Boot 기반 게시판·자료실 API입니다. 프로젝트 루트의 정적 화면(`board.html`, `files.html`)이 운영 API를 호출합니다.

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
| GET | `/api/posts` | 게시글 목록 (최신순) |
| GET | `/api/posts/{id}` | 게시글 상세 |
| POST | `/api/posts` | 게시글 등록 (`title`, `content` JSON) |
| DELETE | `/api/posts/{id}` | 게시글 삭제 |

### 자료실

업로드 요청은 `multipart/form-data`의 `file` 필드를 사용합니다. 파일 크기 제한은 20MB입니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/files` | 파일 목록 |
| POST | `/api/files` | 파일 업로드 |
| GET | `/api/files/{id}/download` | 파일 다운로드 |
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
| POST | `/api/events` | 일정 추가 |
| PUT | `/api/events/{id}` | 내 일정 수정 |
| DELETE | `/api/events/{id}` | 내 일정 삭제 |

게시판·자료실·일정 API에는 `Authorization: Bearer <token>` 헤더가 필요합니다. 회원가입은 아이디(영문 소문자·숫자·밑줄 3~30자), 표시 이름(1~30자), 비밀번호(8자 이상)를 받으며, 관리자가 승인한 뒤 로그인할 수 있습니다. 발급 토큰은 7일 동안 유효합니다.

첫 관리자 계정은 애플리케이션 시작 시 다음 환경변수로 만듭니다. Render에서는 서비스의 **Environment** 설정에 두 값을 입력하고 재배포하세요. 관리자 비밀번호는 12자 이상이어야 하며 코드나 GitHub에 저장하지 마세요.

```text
SAP_ADMIN_USERNAME=사용할_관리자_아이디
SAP_ADMIN_PASSWORD=비공개_관리자_비밀번호
```

이후 사이트의 `로그인 / 회원가입` 화면에서 위 아이디와 비밀번호로 로그인하면 **회원가입 승인** 메뉴가 나타납니다. 로그인 상태로 좌측 메뉴의 **비밀번호 변경**을 열고 현재 비밀번호와 새 비밀번호를 입력하면 계정 비밀번호를 변경할 수 있습니다. 변경 시 기존 로그인 토큰을 모두 폐기하므로 새 비밀번호로 다시 로그인해야 합니다. Render 환경변수 `SAP_ADMIN_PASSWORD`는 관리자 계정을 처음 생성할 때 사용하는 초기값입니다. 이미 존재하는 관리자 계정의 비밀번호는 서버 재시작으로 덮어쓰지 않으며, 일반적인 비밀번호 변경은 사이트 화면에서 진행하세요. 환경변수가 설정되지 않으면 회원가입은 처리되지 않습니다.

## 저장 방식과 배포 주의사항

게시글, 계정, 인증 토큰, 일정과 자료실 파일 메타데이터·본문은 JPA를 통해 설정된 데이터베이스에 저장됩니다. 따라서 Render 서버 재시작·재배포 후에도 DB에 저장된 파일이 유지됩니다. 데이터 보존은 연결된 데이터베이스의 백업·용량 정책을 따릅니다.

## 프론트엔드 연결

저장소 루트의 `board.html`과 `files.html`에 운영 API 주소가 설정되어 있습니다. 로컬 화면에서 Java 서버를 사용하려면 해당 페이지의 `API_BASE`를 `http://127.0.0.1:8080/api/posts` 또는 `http://127.0.0.1:8080/api/files`로 바꾸세요. 브라우저 요청은 `CorsConfig`의 허용 출처 설정을 따릅니다.
