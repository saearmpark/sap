# SAP 학습 사이트

Java, Python, HTML/CSS를 연습하는 개인 학습 사이트입니다.

- 사이트: [GitHub Pages](https://saearmpark.github.io/sap/)
- 저장소: [saearmpark/sap](https://github.com/saearmpark/sap)

## 프로젝트 구성

```text
.
├── index.html, board.html, files.html, game.html  # GitHub Pages 화면
├── assets/                                        # 공통 CSS와 테마 전환 스크립트
├── backend-java/                                  # Spring Boot 게시판 API
├── backend-python/                                # Flask 게시판·자료실 학습용 API
└── games/python/                                  # pygame-ce 게임 실습
```

정적 페이지는 GitHub Pages에서 저장소 루트 기준으로 제공하므로 HTML 파일은 루트에 둡니다. 사이트 화면은 `assets/style.css`와 `assets/theme.js`를 공유합니다. 게시판과 자료실의 운영 API 주소는 `board.html`, `files.html`에서 확인할 수 있습니다.

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
- 게시글은 JPA 저장소를 사용합니다. Java 자료실은 현재 메타데이터를 메모리에, 파일을 서버의 `uploads/` 폴더에 저장합니다. 따라서 Java 서버 재시작 또는 재배포 후 자료실 데이터가 유지된다고 보장할 수 없습니다.
- Flask 대안은 SQLite DB와 업로드 파일을 `backend-python/` 아래에 저장합니다. Render의 임시 파일 시스템에서 실행하면 재시작 후 데이터가 유지되지 않을 수 있습니다.
- `target/`, `uploads/`, Python 캐시와 로컬 DB 파일은 생성되거나 개발 환경에 종속되므로 Git 추적에서 제외합니다.
