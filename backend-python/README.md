# Python 백엔드 (Flask)

Flask와 SQLite로 만든 게시판·자료실 API입니다. 운영 페이지의 Java API와 별도로 실행하는 대안·학습용 구현입니다.

## 실행 방법

Python 3.9 이상을 준비하고 저장소 루트에서 실행합니다.

```bash
cd backend-python
pip install -r requirements.txt
python app.py
```

서버는 `http://127.0.0.1:5000`에서 실행됩니다. 첫 실행 시 `backend-python/board.db`와 `backend-python/uploads/`가 생성됩니다.

## API

### 게시판

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/posts` | 게시글 목록 |
| GET | `/api/posts/<id>` | 게시글 상세 |
| POST | `/api/posts` | 게시글 등록 (`title`, `content` JSON) |
| DELETE | `/api/posts/<id>` | 게시글 삭제 |

### 자료실

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/files` | 파일 목록 |
| POST | `/api/files` | 파일 업로드 (`multipart/form-data`, 필드 `file`) |
| GET | `/api/files/<stored_name>` | 파일 다운로드 |
| DELETE | `/api/files/<stored_name>` | 파일 삭제 |

최대 업로드 크기는 20MB입니다.

## 웹 화면에서 연결하기

정적 페이지는 저장소 루트에 있습니다. Java API 대신 이 서버를 사용할 경우 `board.html`의 `API_BASE`를 `http://127.0.0.1:5000/api/posts`로 변경하세요. 자료실도 사용하려면 `files.html`의 `API_BASE`를 `http://127.0.0.1:5000/api/files`로 변경해야 합니다. 화면과 서버의 출처가 다르므로 Flask의 CORS 설정이 교차 출처 요청을 허용합니다.

## Render 배포 참고

저장소를 Render에 연결할 때 Python 서비스를 설정한다면 Root Directory는 `backend-python`, Build Command는 `pip install -r requirements.txt`, Start Command는 `gunicorn app:app --bind 0.0.0.0:$PORT`를 사용합니다. [`Procfile`](Procfile)에도 시작 명령이 있습니다.

SQLite DB와 업로드 파일은 로컬 파일 시스템에 저장됩니다. 영구 디스크나 외부 저장소를 설정하지 않은 Render 환경에서는 재시작·재배포 후 데이터가 유지되지 않을 수 있습니다.
