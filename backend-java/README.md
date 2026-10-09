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

이후 사이트의 `로그인 / 회원가입` 화면에서 위 아이디와 비밀번호로 로그인하면 **회원가입 승인** 메뉴가 나타납니다. 관리자 비밀번호를 바꾸려면 환경변수 값을 변경하고 서비스를 재시작하세요. 환경변수가 설정되지 않으면 회원가입은 처리되지 않습니다.

## 저장 방식과 배포 주의사항

게시글, 계정, 인증 토큰, 일정은 JPA를 통해 설정된 데이터베이스에 저장됩니다. 자료실은 메타데이터를 메모리의 목록에 보관하고 파일을 `uploads/` 폴더에 저장합니다. 서버 재시작·재배포 시 자료실 목록이 사라지거나 파일이 유실될 수 있으므로 영구 보존에는 DB 기반 메타데이터와 영구 파일 스토리지가 필요합니다.

## 프론트엔드 연결

저장소 루트의 `board.html`과 `files.html`에 운영 API 주소가 설정되어 있습니다. 로컬 화면에서 Java 서버를 사용하려면 해당 페이지의 `API_BASE`를 `http://127.0.0.1:8080/api/posts` 또는 `http://127.0.0.1:8080/api/files`로 바꾸세요. 브라우저 요청은 `CorsConfig`의 허용 출처 설정을 따릅니다.
