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

## 저장 방식과 배포 주의사항

게시글은 JPA 저장소를 통해 설정된 데이터베이스에 저장됩니다. 그러나 현재 자료실 구현은 파일 메타데이터를 메모리의 목록에 보관하고 파일 내용은 `uploads/` 폴더에 저장합니다. 자료실은 데이터베이스에 영구 저장되지 않으며, 서버 재시작·재배포 시 목록이 사라지거나 업로드 파일이 유실될 수 있습니다. Render 운영 환경에서 영구 보존이 필요하면 메타데이터 저장소와 영구 파일 스토리지를 별도로 구성해야 합니다.

## 프론트엔드 연결

저장소 루트의 `board.html`과 `files.html`에 운영 API 주소가 설정되어 있습니다. 로컬 화면에서 Java 서버를 사용하려면 해당 페이지의 `API_BASE`를 `http://127.0.0.1:8080/api/posts` 또는 `http://127.0.0.1:8080/api/files`로 바꾸세요. 브라우저 요청은 `CorsConfig`의 허용 출처 설정을 따릅니다.
