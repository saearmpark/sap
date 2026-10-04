# SAP

Java, Python, HTML/CSS로 웹앱·게임 만드는 법을 단계별로 배우는 개인 학습 사이트입니다.
(사용자 컴퓨터의 `C:\sap` 폴더가 이 프로젝트의 루트입니다.)

## 폴더 구조

```
sap/
 ├─ index.html, board.html, files.html, game.html, style.css
 │    프론트엔드 (Live Server로 여는 화면)
 │
 ├─ backend-python/        게시판 + 자료실 API (Flask, 포트 5000, 로컬 학습용)
 │   ├─ app.py
 │   ├─ requirements.txt
 │   └─ README.md
 │
 ├─ backend-java/          게시판 + 자료실 API (Spring Boot, 포트 8080) — 실제 배포에 쓰는 백엔드
 │   ├─ pom.xml
 │   ├─ src/...
 │   └─ README.md
 │
 └─ games-python/          게임제작 메뉴의 Python(pygame-ce) 버전 STEP 1~4
     ├─ tictactoe_pygame.py
     ├─ breakout_pygame.py
     ├─ shooter_pygame.py
     ├─ puzzle_pygame.py
     └─ README.md
```

## 메뉴 ↔ 폴더 대응표

| 메뉴 (좌측 사이드바) | 화면 파일 | 동작에 필요한 백엔드 |
|---|---|---|
| 홈 | `index.html` | 없음 |
| 게시판 | `board.html` | `backend-java`(8080, 배포 중인 버전) |
| 자료실 | `files.html` | `backend-java`(8080, 배포 중인 버전) |
| 게임제작 | `game.html` | 없음 (브라우저 안에서 전부 동작) |

## 로컬에서 전체 실행하는 순서

1. **백엔드 켜기** — VS Code에서 `backend-java/src/main/java/com/codestudio/board/BoardApplication.java`를 열고 **Run** 버튼 클릭.
   (`http://127.0.0.1:8080` 에서 실행됩니다.)

2. **프론트엔드 열기** — VS Code에서 `index.html`을 오른쪽 클릭 → **Open with Live Server**.

3. 왼쪽 메뉴로 게시판, 자료실, 게임제작을 둘러봅니다. 게임제작은 그 자리에서 바로 플레이할 수 있습니다.

각 폴더의 `README.md`에 더 자세한 실행법과 학습 포인트가 정리되어 있습니다.

## 인터넷에 올리기 (배포)

같은 대화에서 이어지는 안내를 참고하세요 — 무료로 쓸 수 있는 **Render**(백엔드)와 **GitHub Pages**(프론트엔드)
조합으로 올리는 방법을 순서대로 정리해 드립니다.
