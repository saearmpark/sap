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

## API 목록 (Flask 버전과 동일)

| Method | 경로 | 설명 |
|---|---|---|
| GET | `/api/posts` | 전체 글 목록 조회 |
| GET | `/api/posts/{id}` | 글 상세 조회 |
| POST | `/api/posts` | 글 등록 |
| DELETE | `/api/posts/{id}` | 글 삭제 |

## 프론트엔드에서 이 서버 사용하기

`board.html` 안의 다음 줄을 찾아서 포트만 8080으로 바꾸면 Java 백엔드로 그대로 동작합니다.

```js
const API_BASE = "http://127.0.0.1:5000/api/posts";
```

```js
const API_BASE = "http://127.0.0.1:8080/api/posts";
```

데이터는 `backend-java/data/board.mv.db` (H2 파일 데이터베이스)에 저장됩니다.
