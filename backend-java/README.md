# codestudio 게시판 백엔드 (Spring Boot / Java)

Flask 버전과 동일한 API를 Java(Spring Boot)로 구현한 버전입니다. 학습용으로 두 버전을 비교해보세요.

## 준비물

- JDK 17 이상
- VS Code 확장: `Extension Pack for Java`, `Spring Boot Extension Pack` (Maven이 없어도 이 확장이 자동으로 받아줍니다)

## 실행 방법 (VS Code)

1. VS Code에서 `backend-java` 폴더를 엽니다.
2. `src/main/java/com/codestudio/board/BoardApplication.java` 파일을 엽니다.
3. `public static void main` 위에 있는 **Run** 버튼을 클릭합니다.
4. 터미널에 `Tomcat started on port 8080` 문구가 보이면 서버가 켜진 것입니다.

## 실행 방법 (터미널, Maven 설치되어 있는 경우)

```bash
cd backend-java
mvn spring-boot:run
```

서버는 `http://127.0.0.1:8080` 에서 실행됩니다. (Flask 서버는 5000번 포트라 동시에 켜도 충돌하지 않습니다.)

## API 목록

### 게시판

| Method | 경로 | 설명 |
|---|---|---|
| GET | `/api/posts` | 전체 글 목록 조회 |
| GET | `/api/posts/{id}` | 글 상세 조회 |
| POST | `/api/posts` | 글 등록 |
| DELETE | `/api/posts/{id}` | 글 삭제 |

### 자료실 (파일)

파일의 실제 내용도 디스크가 아니라 DB(배포 시 Neon PostgreSQL)에 저장합니다. 그래서
Render 서버가 재시작/재배포되어도 업로드한 파일이 사라지지 않습니다.

| Method | 경로 | 설명 |
|---|---|---|
| GET | `/api/files` | 전체 파일 목록 조회 (파일 내용 제외) |
| POST | `/api/files` | 파일 업로드 (multipart/form-data, 필드명 `file`) |
| GET | `/api/files/{id}/download` | 파일 다운로드 |
| DELETE | `/api/files/{id}` | 파일 삭제 |

## 로컬에서 실행할 때 주의할 점

로컬(VS Code Run 버튼)에서 실행하면 환경변수가 없으므로 자동으로 H2(파일 DB)를 사용합니다.
`backend-java/data/board.mv.db` 파일에 게시글과 업로드한 파일이 함께 저장됩니다.

배포(Render)에서는 `SPRING_DATASOURCE_*` 환경변수가 Neon(PostgreSQL) 값으로 채워져 있으므로
코드 수정 없이 그대로 영구 저장소를 사용하게 됩니다.

## 프론트엔드에서 이 서버 사용하기

`board.html`과 `files.html`의 `API_BASE`는 이미 배포된 주소를 가리키고 있습니다.

```js
// board.html
const API_BASE = "https://board-backend-nngx.onrender.com/api/posts";

// files.html
const API_BASE = "https://board-backend-nngx.onrender.com/api/files";
```

로컬에서 테스트할 때는 포트만 바꿔서 `http://127.0.0.1:8080/api/posts` 처럼 쓰면 됩니다.
