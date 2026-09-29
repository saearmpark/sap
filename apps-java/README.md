# codestudio App제작 실습 (Java)

app.html의 "App제작" 메뉴에 있는 STEP과 같은 순서로 진행하는 Java 콘솔/GUI 실습 폴더입니다.
`backend-java`(Spring Boot 서버)와는 별개의, 프레임워크 없는 순수 Java 연습 코드입니다.

## STEP 1: 콘솔 계산기

### 실행 방법 (VS Code)

1. `apps-java` 폴더를 VS Code에서 엽니다 (또는 `sap` 폴더를 연 상태로 `apps-java/Step1Calculator.java`를 엽니다).
2. `main` 메서드 위에 뜨는 **Run** 버튼을 클릭합니다.
3. 아래 터미널(또는 Debug Console)에 입력창이 나타납니다.

### 실행 방법 (터미널)

```bash
cd apps-java
javac Step1Calculator.java
java Step1Calculator
```

### 사용법

```
> 3 + 5
결과: 8.0
> 10 / 0
오류: 0으로 나눌 수 없습니다.
> exit
계산기를 종료합니다.
```

## 학습 포인트

- **Scanner로 입력 받기**: `System.in`을 감싼 `Scanner`로 한 줄씩 입력을 읽습니다.
- **입력 검증과 예외 처리**: 숫자가 아닌 값이 들어오거나(`NumberFormatException`), 0으로 나누는 경우
  (`ArithmeticException`)를 각각 다르게 처리합니다. 게시판 백엔드(Flask/Spring Boot)에서 이미 써본
  "잘못된 입력에는 에러 메시지로 응답한다"는 패턴이 콘솔 프로그램에도 똑같이 적용됩니다.
- **반복 루프**: `while (true)` 안에서 `exit` 입력이 들어올 때까지 계속 입력을 받는 구조는
  게임제작 STEP 1(틱택토)의 게임 루프와도 비슷한 개념입니다.

## STEP 2: 할일 관리 CLI

### 실행 방법

VS Code에서 `Step2TodoCli.java`를 열고 `main` 메서드 위의 **Run** 버튼을 클릭하거나, 터미널에서:

```bash
cd apps-java
javac Step2TodoCli.java
java Step2TodoCli
```

### 사용법

```
> add 우유 사기
추가했습니다: 우유 사기
> add 운동하기
> list
1. [ ] 우유 사기
2. [ ] 운동하기
> done 1
완료: 우유 사기
> del 2
삭제했습니다: 운동하기
> exit
```

명령어: `add 내용` · `list` · `done 번호`(다시 입력하면 해제) · `del 번호` · `help` · `exit`

프로그램을 껐다가 다시 실행해도 목록이 남아 있습니다. 시작할 때 화면에 **저장 위치**(`todos.txt`의 전체 경로)가
표시되니 확인해 보세요. VS Code의 Run 버튼으로 실행하면 보통 열어둔 프로젝트 폴더에 만들어집니다.

### 학습 포인트

- **리스트(ArrayList)로 여러 데이터 관리**: 할일 하나를 `Todo` 클래스로 만들고, 여러 개를 `List<Todo>`에 담아
  추가·조회·삭제합니다. 게시판의 글 목록과 같은 구조입니다.
- **파일 저장/불러오기**: 프로그램을 시작할 때 `load()`로 읽고, 내용이 바뀔 때마다 `save()`로 씁니다.
  한 줄에 `0|내용`(미완료) / `1|내용`(완료) 형식으로 저장합니다. STEP 4에서 이 파일 저장을 DB로 바꿔볼 예정입니다.
- **명령어 파싱**: `add 우유 사기`를 `split("\\s+", 2)`로 "명령어"와 "나머지"로 나누는 방법을 익힙니다.
- **입력 검증**: 번호가 숫자가 아니거나 범위를 벗어나면 에러 대신 안내 메시지를 보여줍니다.

### 한글이 깨져 보일 때

터미널 인코딩과 Java 설정이 어긋나면 한글 입력/출력이 깨질 수 있습니다. 이 경우 터미널에서
`java -Dfile.encoding=UTF-8 -Dstdin.encoding=UTF-8 Step2TodoCli` 로 실행해 보세요.

## STEP 3: Swing GUI 메모장

### 실행 방법

VS Code에서 `Step3Notepad.java`를 열고 `main` 메서드 위의 **Run** 버튼을 클릭하거나:

```bash
cd apps-java
javac Step3Notepad.java
java Step3Notepad
```

메뉴바(파일 → 새로 만들기 / 열기 / 저장 / 다른 이름으로 저장 / 종료)가 있는 텍스트 편집 창이 뜹니다.
글자를 입력하면 제목표시줄 맨 앞에 `*`가 붙어 "저장 안 됨"을 표시하고, 저장하면 사라집니다.
저장하지 않고 새 파일을 열거나 창을 닫으려 하면 저장할지 물어봅니다.

### 학습 포인트

- **이벤트 기반 프로그래밍**: STEP 1, 2는 위에서 아래로 코드가 순서대로 실행됐지만, GUI는 다릅니다.
  `main`은 창을 띄우기만 하고, 그 다음부터는 "버튼을 누르면 이 코드를 실행해라"처럼 이벤트가 생길 때마다
  등록해둔 코드(`addActionListener`)가 호출됩니다.
- **상태 관리**: `currentFile`(어떤 파일을 열었는지)과 `modified`(수정했는지)라는 두 변수만으로
  제목표시줄 표시, 저장 확인 대화상자 여부 같은 여러 화면 동작을 결정합니다.
- **파일 입출력 재사용**: STEP 2에서 썼던 `Files.readString` / `Files.writeString`이 여기서도 그대로
  쓰입니다. 콘솔이든 GUI든 "파일을 읽고 쓰는" 방법 자체는 같다는 걸 확인할 수 있습니다.
- **SwingUtilities.invokeLater**: Swing 화면은 별도의 스레드(Event Dispatch Thread)에서 안전하게 시작해야
  하므로 관례적으로 이 코드로 감싸서 실행합니다.

## STEP 4: DB 연동 앱 (JDBC)

이번 폴더는 `apps-java` 바로 아래가 아니라 `apps-java/db-demo`에 있습니다. 의존성(H2 드라이버)이
필요해서 STEP 1~3과 달리 작은 Maven 프로젝트로 구성했습니다.

### 준비물

`backend-java`(Spring Boot)를 한 번이라도 실행해서 `backend-java/data/board.mv.db` 파일과
`posts` 테이블이 만들어져 있어야 합니다. STEP 3 진행 중 이미 실행해보셨다면 준비된 상태입니다.

### 실행 방법

```bash
cd apps-java/db-demo
mvn compile exec:java
```

또는 VS Code에서 `DbDemo.java`를 열고 `main` 메서드 위의 **Run** 버튼을 클릭합니다.

### 확인해보기

1. 위 명령을 실행하면 콘솔에 등록 전/후 게시글 목록이 출력됩니다.
2. `backend-java`(Spring Boot, 8080번 포트)를 켜고, `board.html`의 `API_BASE`를 8080으로 바꾼 상태로 열어보세요.
3. 방금 콘솔 프로그램이 JDBC로 직접 등록한 글("JDBC 콘솔에서 등록")이 게시판 화면에도 그대로 보입니다.

### 학습 포인트

- **JDBC vs JPA**: STEP 3(Spring Boot)에서는 `repository.save(post)` 한 줄이면 됐지만, 사실 그 안에서는
  이번에 직접 쓴 것과 비슷한 `INSERT INTO posts (...) VALUES (...)` SQL이 실행되고 있었습니다.
  JPA/Hibernate는 이 SQL을 자동으로 만들어주는 도구일 뿐, 결국 밑바탕은 JDBC입니다.
- **PreparedStatement로 안전하게 값 채우기**: SQL 문자열에 값을 직접 이어붙이지 않고 `?` 자리표시자에
  `setString()`으로 값을 넣는 방식이 SQL 인젝션을 막는 기본 습관입니다.
- **try-with-resources**: `Connection`, `Statement`, `ResultSet`을 `try (... ) { }` 안에서 열면
  블록이 끝날 때 자동으로 닫힙니다. 파일이나 DB 연결처럼 "다 쓰면 반드시 닫아야 하는" 자원에 쓰는 관용구입니다.
- **같은 DB를 여러 프로그램이 공유**: `AUTO_SERVER=TRUE` 옵션 덕분에 Spring Boot 서버가 켜져 있는 동안에도
  이 콘솔 프로그램이 동시에 같은 DB 파일에 접속할 수 있습니다.

여기까지 마치면 App제작 4단계(콘솔 입출력 → 리스트/파일 저장 → GUI/이벤트 → DB 연동)를 모두 익힌 것입니다.

