/**
 * STEP 4: DB 연동 앱 (Java + JDBC, 프레임워크 없이)
 *
 * app.html의 "App제작" 메뉴 STEP 4에 해당하는 예제입니다.
 *
 * backend-java(Spring Boot)에서는 @Entity, JpaRepository 같은 것들이 SQL을 대신 만들어줬습니다.
 * 이번에는 그 편리함을 걷어내고, JDBC(Connection, PreparedStatement, ResultSet)로
 * 같은 board.mv.db 파일(backend-java가 쓰던 그 DB)에 직접 접속해서 SQL을 손으로 실행해봅니다.
 *
 * 실행 방법:
 *   1) backend-java를 한 번이라도 실행해서 posts 테이블이 만들어져 있어야 합니다.
 *      (이미 STEP 2 때 실행해보셨다면 준비된 상태입니다.)
 *   2) 이 폴더(db-demo)에서:
 *        mvn compile exec:java
 *      또는 VS Code에서 DbDemo.java 열고 main 위 Run 버튼 클릭
 *   3) 실행 후 backend-java 서버(8080)를 켜고 board.html(API_BASE를 8080으로 바꾼 버전)을
 *      열어보면, 이 콘솔 프로그램이 JDBC로 직접 넣은 글이 게시판에 그대로 보입니다.
 *
 * DB 파일은 AUTO_SERVER=TRUE 옵션 덕분에 Spring Boot 서버가 켜져 있어도 동시에 접속할 수 있습니다.
 */

package com.codestudio.dbdemo;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class DbDemo {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public static void main(String[] args) {
        System.out.println("=== JDBC로 backend-java의 DB에 직접 접속 ===");

        String dbUrl = resolveDbUrl();
        System.out.println("사용할 DB 경로: " + dbUrl);

        try (Connection conn = DriverManager.getConnection(dbUrl, "sa", "")) {
            System.out.println("접속 성공");
            System.out.println();

            System.out.println("--- 등록 전 목록 (Spring Boot가 만든 posts 테이블) ---");
            listPosts(conn);

            String title = "JDBC 콘솔에서 등록";
            String content = "이 글은 Spring Boot가 아니라 순수 JDBC로 직접 INSERT한 것입니다.";
            insertPost(conn, title, content);
            System.out.println();
            System.out.println("등록했습니다: " + title);

            System.out.println();
            System.out.println("--- 등록 후 목록 ---");
            listPosts(conn);

        } catch (SQLException e) {
            System.out.println("DB 접속/실행 중 오류가 발생했습니다: " + e.getMessage());
            System.out.println("backend-java를 한 번도 실행하지 않았다면 posts 테이블이 아직 없을 수 있습니다.");
            System.out.println("STEP 2(Spring Boot)를 먼저 한 번 실행해서 테이블을 만들어주세요.");
        }
    }

    /**
     * 실행 방식(Run 버튼 vs 터미널)에 따라 현재 작업 폴더가 달라지므로,
     * 실제로 board.mv.db 파일이 존재하는 위치를 여러 후보 중에서 찾아냅니다.
     * VS Code의 Run 버튼은 워크스페이스 루트(sap 폴더)를 작업 폴더로 쓰는 경우가 많아서,
     * backend-java 안이 아니라 sap 바로 아래에 data 폴더가 생기는 경우도 후보에 포함합니다.
     */
    private static String resolveDbUrl() {
        String[] candidates = {
                "../../backend-java/data",   // db-demo 폴더 안에서 터미널로 실행한 경우
                "backend-java/data",         // sap 폴더를 워크스페이스 루트로 Run 버튼 실행한 경우
                "../backend-java/data",      // apps-java 폴더 안에서 실행한 경우
                "data",                      // Spring Boot를 Run 버튼으로 실행해 sap 바로 아래에 생긴 경우
                "../../data",                // 위와 같은 경우, db-demo 폴더 기준
                "../data",                   // 위와 같은 경우, apps-java 폴더 기준
        };

        System.out.println("현재 작업 폴더: " + new File("").getAbsolutePath());

        for (String candidate : candidates) {
            File dbFile = new File(candidate, "board.mv.db");
            System.out.println("  확인 중: " + dbFile.getAbsolutePath() + " -> " + (dbFile.exists() ? "있음" : "없음"));
            if (dbFile.exists()) {
                String path = new File(candidate, "board").getPath().replace(File.separatorChar, '/');
                return "jdbc:h2:file:" + path + ";AUTO_SERVER=TRUE";
            }
        }

        // 아무 후보에도 파일이 없으면 (아직 한 번도 안 만들어진 경우) 터미널 실행 기준 경로를 기본값으로 사용
        System.out.println("경고: 기존 board.mv.db를 찾지 못했습니다. backend-java를 먼저 실행했는지 확인하세요.");
        return "jdbc:h2:file:../../backend-java/data/board;AUTO_SERVER=TRUE";
    }

    // ResultSet(조회 결과)을 한 줄씩 읽어 화면에 출력합니다.
    private static void listPosts(Connection conn) throws SQLException {
        String sql = "SELECT id, title, created_at FROM posts ORDER BY id DESC";

        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            boolean any = false;
            while (rs.next()) {
                any = true;
                long id = rs.getLong("id");
                String title = rs.getString("title");
                String createdAt = rs.getString("created_at");
                System.out.printf("  [%d] %s (%s)%n", id, title, createdAt);
            }
            if (!any) {
                System.out.println("  (등록된 글이 없습니다)");
            }
        }
    }

    // ? 자리에 값을 안전하게 채워 넣는 PreparedStatement로 INSERT 합니다.
    // (문자열을 SQL에 직접 이어붙이지 않는 것이 SQL 인젝션을 막는 기본 습관입니다.)
    private static void insertPost(Connection conn, String title, String content) throws SQLException {
        String sql = "INSERT INTO posts (title, content, created_at) VALUES (?, ?, ?)";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, title);
            ps.setString(2, content);
            ps.setString(3, LocalDateTime.now().format(FORMATTER));
            ps.executeUpdate();
        }
    }
}
