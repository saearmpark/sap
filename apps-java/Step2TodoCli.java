/**
 * STEP 2: 할일 관리 CLI (Java)
 *
 * app.html의 "App제작" 메뉴 STEP 2에 해당하는 예제입니다.
 * STEP 1(계산기)이 "입력 → 계산 → 출력"으로 끝났다면, 이번에는
 *   1) 여러 개의 데이터를 리스트(ArrayList)로 관리하고
 *   2) 프로그램을 꺼도 남도록 파일(todos.txt)에 저장/불러오기
 * 를 연습합니다. 게시판 백엔드에서 DB에 글을 저장하던 것을 "파일"로 단순화한 버전입니다.
 *
 * 명령어:
 *   add 할일내용   할일 추가
 *   list           목록 보기
 *   done 번호      완료 표시 (다시 입력하면 해제)
 *   del 번호       삭제
 *   help           도움말
 *   exit           종료
 *
 * 실행 방법 (VS Code): main 메서드 위의 Run 버튼 클릭
 * 실행 방법 (터미널):
 *   javac Step2TodoCli.java
 *   java Step2TodoCli
 */

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class Step2TodoCli {

    // 할일 하나를 표현하는 클래스
    static class Todo {
        String text;
        boolean done;

        Todo(String text, boolean done) {
            this.text = text;
            this.done = done;
        }
    }

    // 프로그램을 실행한 폴더에 todos.txt 로 저장됩니다.
    private static final Path FILE = Paths.get("todos.txt");

    public static void main(String[] args) {
        List<Todo> todos = load();

        // 콘솔 입력 인코딩에 맞춰 Scanner를 만든다 (한글 입력 깨짐 방지)
        String inputEncoding = System.getProperty("stdin.encoding", Charset.defaultCharset().name());
        Scanner scanner = new Scanner(System.in, inputEncoding);

        System.out.println("=== 할일 관리 CLI ===");
        System.out.println("저장 위치: " + FILE.toAbsolutePath());
        printHelp();

        while (true) {
            System.out.print("> ");
            if (!scanner.hasNextLine()) {
                break;
            }
            String line = scanner.nextLine().trim();
            if (line.isEmpty()) {
                continue;
            }

            // "add 우유 사기" → 명령어 "add", 나머지 "우유 사기"
            String[] parts = line.split("\\s+", 2);
            String command = parts[0].toLowerCase();
            String argument = parts.length > 1 ? parts[1].trim() : "";

            if (command.equals("exit")) {
                System.out.println("종료합니다.");
                break;
            }

            switch (command) {
                case "add":
                    if (argument.isEmpty()) {
                        System.out.println("할일 내용을 입력하세요. 예: add 우유 사기");
                        break;
                    }
                    todos.add(new Todo(argument, false));
                    save(todos);
                    System.out.println("추가했습니다: " + argument);
                    break;

                case "list":
                    printList(todos);
                    break;

                case "done":
                    Todo target = findByNumber(todos, argument);
                    if (target != null) {
                        target.done = !target.done;
                        save(todos);
                        System.out.println((target.done ? "완료: " : "완료 해제: ") + target.text);
                    }
                    break;

                case "del":
                    Todo removed = findByNumber(todos, argument);
                    if (removed != null) {
                        todos.remove(removed);
                        save(todos);
                        System.out.println("삭제했습니다: " + removed.text);
                    }
                    break;

                case "help":
                    printHelp();
                    break;

                default:
                    System.out.println("알 수 없는 명령어입니다. help 를 입력해보세요.");
            }
        }

        scanner.close();
    }

    // "3" 같은 문자열을 받아 해당 번호(1부터 시작)의 할일을 돌려준다. 잘못된 입력이면 안내 후 null.
    private static Todo findByNumber(List<Todo> todos, String argument) {
        try {
            int number = Integer.parseInt(argument);
            if (number < 1 || number > todos.size()) {
                System.out.println("1 ~ " + todos.size() + " 사이의 번호를 입력하세요.");
                return null;
            }
            return todos.get(number - 1);
        } catch (NumberFormatException e) {
            System.out.println("번호를 입력하세요. 예: done 2");
            return null;
        }
    }

    private static void printList(List<Todo> todos) {
        if (todos.isEmpty()) {
            System.out.println("(할일이 없습니다)");
            return;
        }
        for (int i = 0; i < todos.size(); i++) {
            Todo t = todos.get(i);
            System.out.println((i + 1) + ". [" + (t.done ? "x" : " ") + "] " + t.text);
        }
    }

    private static void printHelp() {
        System.out.println("명령어: add 내용 | list | done 번호 | del 번호 | help | exit");
    }

    // 파일 형식: 한 줄에 하나씩  "0|내용" (미완료) / "1|내용" (완료)
    private static List<Todo> load() {
        List<Todo> todos = new ArrayList<>();
        if (!Files.exists(FILE)) {
            return todos;
        }
        try {
            for (String line : Files.readAllLines(FILE, StandardCharsets.UTF_8)) {
                int sep = line.indexOf('|');
                if (sep < 0) {
                    continue; // 형식이 맞지 않는 줄은 건너뜀
                }
                boolean done = line.substring(0, sep).equals("1");
                todos.add(new Todo(line.substring(sep + 1), done));
            }
        } catch (IOException e) {
            System.out.println("파일을 읽지 못했습니다: " + e.getMessage());
        }
        return todos;
    }

    private static void save(List<Todo> todos) {
        List<String> lines = new ArrayList<>();
        for (Todo t : todos) {
            lines.add((t.done ? "1" : "0") + "|" + t.text);
        }
        try {
            Files.write(FILE, lines, StandardCharsets.UTF_8);
        } catch (IOException e) {
            System.out.println("파일을 저장하지 못했습니다: " + e.getMessage());
        }
    }
}
