# codestudio 게시판 백엔드 (Flask)

## 실행 방법

```bash
cd backend-python
pip install -r requirements.txt
python app.py
```

서버가 `http://127.0.0.1:5000` 에서 실행되고, 첫 실행 시 같은 폴더에 `board.db`(SQLite)가 자동 생성됩니다.

## API 목록

| Method | 경로 | 설명 |
|---|---|---|
| GET | `/api/posts` | 전체 글 목록 조회 |
| GET | `/api/posts/<id>` | 글 상세 조회 |
| POST | `/api/posts` | 글 등록 (`{"title": "...", "content": "..."}`) |
| DELETE | `/api/posts/<id>` | 글 삭제 |

## 프론트엔드 연결

`frontend` 폴더의 `board.html`을 Live Server(VS Code 확장)로 열면, 위 서버가 켜져 있는 동안
글 목록을 불러오고 새 글을 등록할 수 있습니다. 백엔드(5000번 포트)와 프론트엔드(보통 5500번 포트)를
동시에 실행해야 합니다.

## 배포 (Render 무료 플랜)

1. 이 프로젝트를 GitHub 저장소에 올립니다.
2. [render.com](https://render.com)에서 New → Web Service → 해당 저장소 선택.
3. 설정:
   - Root Directory: `backend-python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT` (Procfile이 있으면 자동 인식됩니다)
4. 배포가 끝나면 `https://<서비스이름>.onrender.com` 같은 주소가 생깁니다. 이 주소가 프론트엔드의 `API_BASE`가 됩니다.

**주의(무료 플랜의 한계)**: Render 무료 웹 서비스는 파일시스템이 영구적이지 않습니다. 서버가 재시작되면
`board.db`와 업로드한 파일이 초기화될 수 있습니다. 연습·시연용으로는 충분하지만, 데이터를 계속 보존하려면
유료 플랜의 디스크(Disk) 기능이나 외부 DB(예: Render의 무료 PostgreSQL)로 바꿔야 합니다.
