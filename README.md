# SAP 학습 사이트

Java, Python, HTML/CSS를 연습하는 개인 학습 사이트입니다.

- 사이트: [GitHub Pages](https://saearmpark.github.io/sap/)
- 저장소: [saearmpark/sap](https://github.com/saearmpark/sap)

## 프로젝트 구성

```text
.
├── index.html, calendar.html, learn.html, concepts.html, web.html # 홈, 일정, 학습 화면
├── board.html, files.html, game.html              # 게시판, 자료실, 게임 화면
├── assets/                                        # 공통 CSS와 테마 전환 스크립트
├── backend-java/                                  # Spring Boot 게시판 API
├── backend-python/                                # Flask 게시판·자료실 학습용 API
└── games/python/                                  # pygame-ce 게임 실습
```

정적 페이지는 GitHub Pages에서 저장소 루트 기준으로 제공하므로 HTML 파일은 루트에 둡니다. 사이트 화면은 `assets/style.css`와 `assets/theme.js`를 공유합니다. 게시판과 자료실은 회원가입 후 관리자 승인과 로그인이 필요하며, 일정도 로그인한 계정별로 저장됩니다. 인증·회원 승인·일정 API는 Java 백엔드에 있습니다.

`web.html`에는 HTML·CSS·JavaScript로 작은 웹사이트를 만들고 GitHub Pages에 게시하는 단계별 초보자 안내가 있습니다.
`concepts.html`에는 프로그래밍 언어, 컴퓨터·통신 기초와 제작 용어를 정리했습니다.

## 로컬 실행

### 웹 화면

저장소 루트에서 VS Code Live Server로 `index.html`을 엽니다. 게시판과 자료실 API를 사용하려면 아래 Java 또는 Python 서버도 실행해야 합니다.

### Java API

JDK 17 이상이 필요합니다. 터미널에서:

```bash
cd backend-java
mvn spring-boot:run
```

기본 주소는 `http://127.0.0.1:8080`이며, 로컬 기본 데이터베이스는 `backend-java/data/` 아래의 H2 파일입니다. 자세한 API와 저장 방식은 [`backend-java/README.md`](backend-java/README.md)를 참고하세요.

### Python 게임

```bash
cd games/python
pip install -r requirements.txt
python tictactoe_pygame.py
```

게임별 실행 방법은 [`games/python/README.md`](games/python/README.md)에 있습니다.

### Flask API (대안·학습용)

```bash
cd backend-python
pip install -r requirements.txt
python app.py
```

기본 주소는 `http://127.0.0.1:5000`입니다. 상세 안내는 [`backend-python/README.md`](backend-python/README.md)를 참고하세요.

## 배포 및 데이터 참고

- GitHub Pages는 루트 HTML과 `assets/`의 정적 파일을 제공합니다.
- 게시판·자료실 프론트엔드는 Render의 Java API를 사용합니다.
- 게시글과 Java 자료실 파일은 JPA를 통해 설정된 데이터베이스에 저장됩니다. Render 서버가 재시작되거나 재배포되어도 DB에 저장한 파일은 유지됩니다.
- 계정 비밀번호는 BCrypt로 해시해 저장하고, 7일 유효 인증 토큰은 DB에 해시 형태로 저장합니다. 계정과 일정은 JPA 데이터베이스에 저장됩니다.
- 첫 관리자 계정은 Render 환경변수 `SAP_ADMIN_USERNAME`, `SAP_ADMIN_PASSWORD`로 설정합니다. 승인 페이지는 관리자로 로그인하면 메뉴에 표시됩니다.
- Flask 대안은 SQLite DB와 업로드 파일을 `backend-python/` 아래에 저장합니다. Render의 임시 파일 시스템에서 실행하면 재시작 후 데이터가 유지되지 않을 수 있습니다.
- `target/`, `uploads/`, Python 캐시와 로컬 DB 파일은 생성되거나 개발 환경에 종속되므로 Git 추적에서 제외합니다.
