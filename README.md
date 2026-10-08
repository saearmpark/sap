# SAP

Java, Python, HTML/CSS로 웹앱과 게임을 만드는 개인 학습 사이트입니다.

## 프로젝트 구조

```text
sap/
├─ index.html, board.html, files.html, game.html  # GitHub Pages 진입 화면
├─ assets/
│  ├─ style.css                                   # 공통 스타일과 테마
│  └─ theme.js                                    # 화이트/블랙 모드
├─ backend-java/                                  # 운영 API (Spring Boot, 8080)
│  └─ data/                                       # Java를 backend-java에서 실행할 때 쓰는 로컬 H2 DB
├─ backend-python/                                # Flask API 학습용 대안 (5000)
├─ games/python/                                  # pygame-ce 게임 실습
├─ data/                                          # 저장소 루트 실행에서 생긴 이전 H2 데이터, 보존 중
└─ .vscode/                                       # 로컬 개발 환경 설정
```

HTML 페이지는 GitHub Pages가 저장소 루트에서 제공하므로 루트에 둡니다. 공통 CSS와 JavaScript는 `assets/`에 모았습니다.
운영 사이트의 게시판·자료실은 `backend-java/`를 사용하며, `backend-python/`은 별도 학습용 구현입니다.

## 로컬 실행

1. Java 백엔드 실행: `backend-java/`에서 VS Code의 `BoardApplication.java`를 실행하거나 `mvn spring-boot:run`을 실행합니다.
   기본 주소는 `http://127.0.0.1:8080`입니다.
2. 웹 화면 실행: 저장소 루트의 `index.html`을 Live Server로 엽니다.
3. Python 게임 실행: `games/python/`에서 `pip install -r requirements.txt` 후 원하는 게임 파일을 실행합니다.
4. Flask 대안 실행: `backend-python/`에서 `pip install -r requirements.txt` 후 `python app.py`를 실행합니다.

두 H2 데이터 폴더는 실행 위치에 따라 서로 다른 로컬 DB가 만들어진 과거 자료라 보존했습니다. Maven 빌드 결과와 업로드 폴더는 실행 시 다시 만들어지는 생성물입니다.

## 배포

- GitHub Pages는 저장소 루트의 HTML과 `assets/`를 제공합니다.
- Render 백엔드는 `backend-java/`의 Spring Boot 애플리케이션을 사용합니다.
- 프론트엔드 API 주소는 `board.html`과 `files.html`에 설정되어 있습니다.
