# 업무용 데스크톱 도구

Python + Tkinter로 만든 Windows용 업무 도구 모음입니다. 소스로 바로 실행하거나, PyInstaller로 단일 실행파일(.exe)을 만들어 배포할 수 있습니다.

## 도구 목록

| 파일 | 실행파일 이름 | 설명 |
| --- | --- | --- |
| `file_renamer.py` | `FileRenamer.exe` | 파일 이름 일괄 변경(찾기/바꾸기, 접두·접미, 번호 매기기, 대소문자, 미리보기) |
| `duplicate_finder.py` | `DuplicateFinder.exe` | 해시로 중복 파일을 찾아 `_duplicates` 폴더로 이동하거나 삭제 |
| `folder_organizer.py` | `FolderOrganizer.exe` | 확장자별 폴더 자동 정리, 되돌리기 지원 |
| `image_batch.py` | `ImageBatch.exe` | 이미지 일괄 리사이즈/포맷 변환(Pillow) |
| `input_recorder.py` | `InputRecorder.exe` | 키보드·마우스 동작 녹화 후 재생(매크로) |

## 소스로 실행하기

```powershell
python -m pip install -r requirements.txt
python file_renamer.py
```

각 파일은 개별 실행되며, tkinter가 포함된 표준 Python 3.10 이상을 권장합니다.

## 실행파일(.exe) 만들기

```powershell
.\build.ps1
```

- 실행하면 `requirements.txt`와 `pyinstaller`를 설치한 뒤 `dist/` 폴더에 5개의 `.exe`를 만듭니다.
- 만든 `.exe`는 다른 PC로 복사해 바로 실행할 수 있습니다.
- GitHub Actions(`.github/workflows/build-tools.yml`)에서도 태그 푸시 시 `.exe`가 릴리스 첨부 파일로 만들어집니다.

## 사용 팁

- 중복 정리와 폴더 정리는 되돌리기(또는 `_duplicates` 이동)를 기본으로 하여 원본 손실을 줄입니다.
- 키보드·마우스 녹화는 시작 후 3초 뒤부터 기록되며, 종료는 F9 키입니다. 재생 중에는 ESC 또는 중지 버튼으로 멈춥니다.
- 녹화/재생은 화면 좌표를 그대로 사용하므로 같은 해상도·배율 환경에서 사용하는 것이 좋습니다.
