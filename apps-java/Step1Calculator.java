/**
 * STEP 1: 콘솔 계산기 (Java)
 *
 * app.html의 "App제작" 메뉴 STEP 1에 해당하는 예제입니다.
 * Spring Boot 같은 프레임워크 없이, 순수 Java만으로 콘솔에서 입출력을 주고받는
 * 가장 기본적인 형태입니다. 입출력(Scanner), 조건문, 반복문, 예외 처리를 한 번에 연습합니다.
 *
 * 실행 방법 (VS Code):
 *   1) 이 파일을 열고 main 메서드 위의 Run 버튼을 클릭
 *
 * 실행 방법 (터미널):
 *   javac Step1Calculator.java
 *   java Step1Calculator
 */

import java.util.Scanner;

public class Step1Calculator {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("=== 콘솔 계산기 ===");
        System.out.println("형식: 숫자1 연산자 숫자2   (예: 3 + 5)");
        System.out.println("종료하려면 'exit' 입력");
        System.out.println();

        while (true) {
            System.out.print("> ");
            String line = scanner.nextLine().trim();

            if (line.equalsIgnoreCase("exit")) {
                System.out.println("계산기를 종료합니다.");
                break;
            }

            if (line.isEmpty()) {
                continue;
            }

            String[] tokens = line.split("\\s+");
            if (tokens.length != 3) {
                System.out.println("형식이 올바르지 않습니다. 예: 3 + 5");
                continue;
            }

            try {
                double a = Double.parseDouble(tokens[0]);
                String op = tokens[1];
                double b = Double.parseDouble(tokens[2]);

                double result = calculate(a, op, b);
                System.out.println("결과: " + result);

            } catch (NumberFormatException e) {
                System.out.println("숫자를 제대로 입력해주세요.");
            } catch (ArithmeticException e) {
                System.out.println("오류: " + e.getMessage());
            } catch (IllegalArgumentException e) {
                System.out.println("지원하지 않는 연산자입니다. (+, -, *, / 만 가능)");
            }
        }

        scanner.close();
    }

    private static double calculate(double a, String op, double b) {
        switch (op) {
            case "+":
                return a + b;
            case "-":
                return a - b;
            case "*":
                return a * b;
            case "/":
                if (b == 0) {
                    throw new ArithmeticException("0으로 나눌 수 없습니다.");
                }
                return a / b;
            default:
                throw new IllegalArgumentException("알 수 없는 연산자: " + op);
        }
    }
}
