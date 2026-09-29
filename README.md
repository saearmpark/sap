# codestudio

Java, Python, HTML/CSS로 웹앱·게임·App 만드는 법을 단계별로 배우는 개인 학습 사이트입니다.
(사용자 컴퓨터의 `C:\sap` 폴더가 이 프로젝트의 루트입니다.)

## 폴더 구조

```
codestudio/
 ├─ index.html, board.html, files.html, game.html, app.html, mypage.html, style.css
 │    프론트엔드 (Live Server로 여는 화면)
 │
 ├─ backend-python/        게시판 + 자료실 API (Flask, 포트 5000)
 │   ├─ app.py
 │   ├─ requirements.txt
 │   └─ README.md
 │
 ├─ backend-java/          게시판 API (Spring Boot, 포트 8080) — Flask와 같은 기능의 Java 버전
 │   ├─ pom.xml
 │   ├─ src/...
 │   └─ README.md
 │
 ├─ games-python/          게임제작 메뉴의 Python(pygame-ce) 버전 STEP 1~4
 │   ├─ tictactoe_pygame.py
 │   ├─ breakout_pygame.py
 │   ├─ shooter_pygame.py
 │   ├─ puzzle_pygame.py
 │   └─ README.md
 │
 └─ apps-java/             App제작 메뉴 STEP 1~4
     ├─ Step1Calculator.java   (콘솔 계산기)
     ├─ Step2TodoCli.java      (할일 관리 CLI)
     ├─ Step3Notepad.java      (Swing GUI 메모장)
     ├─ db-demo/               (STEP 4: JDBC로 backend-java의 DB에 직접 접속)
     └─ README.md
```

## 메뉴 ↔ 폴더 대응표

| 메뉴 (좌측 사이드바) | 화면 파일 | 동작에 필요한 백엔드 |
|---|---|---|
| 홈 | `index.html` | 없음 |
| 게시판 | `board.html` | `backend-python`(5000) 또는 `backend-java`(8080) |
| 자료실 | `files.html` | `backend-python`(5000) |
| 게임제작 | `game.html` | 없음 (브라우저 안에서 전부 동작) |
| App제작 | `app.html` | 없음 (소개 페이지, 실제 실습은 `apps-java` 폴더) |
| 마이페이지 | `mypage.html` | 없음 (브라우저에 저장) |

## 로컬에서 전체 실행하는 순서

1. **백엔드 켜기** — 터미널에서:
   ```bash
   cd backend-python
   pip install -r requirements.txt
   python app.py
   ```
   (`http://127.0.0.1:5000` 에서 실행됩니다. 껐다 켜도 `board.db`에 데이터가 남아있습니다.)

2. **프론트엔드 열기** — VS Code에서 `index.html`을 오른쪽 클릭 → **Open with Live Server**.

3. 왼쪽 메뉴로 게시판, 자료실, 게임제작, App제작을 둘러봅니다. 게임제작은 그 자리에서 바로 플레이할 수 있고,
   App제작은 `apps-java` 폴더의 각 STEP 파일을 VS Code에서 직접 실행해봅니다.

각 폴더의 `README.md`에 더 자세한 실행법과 학습 포인트가 정리되어 있습니다.

## 인터넷에 올리기 (배포)

같은 대화에서 이어지는 안내를 참고하세요 — 무료로 쓸 수 있는 **Render**(백엔드)와 **GitHub Pages**(프론트엔드)
조합으로 올리는 방법을 순서대로 정리해 드립니다.
