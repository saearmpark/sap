package com.codestudio.dbdemo;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class DbDemoTest {

    @Test
    void insertPostBindsValuesAsParameters() throws Exception {
        String databaseName = "db-demo-test-" + UUID.randomUUID().toString().replace("-", "");
        String title = "Title'); DROP TABLE posts; --";
        String content = "Body";

        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:" + databaseName);
                Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE posts (id BIGINT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), "
                    + "content VARCHAR(4000), created_at VARCHAR(16))");
            invokePrivate("insertPost", new Class<?>[] { Connection.class, String.class, String.class },
                    connection, title, content);

            try (ResultSet rows = statement.executeQuery("SELECT title, content FROM posts")) {
                assertTrue(rows.next());
                assertEquals(title, rows.getString("title"));
                assertEquals(content, rows.getString("content"));
                assertTrue(!rows.next());
            }

            statement.execute("SELECT COUNT(*) FROM posts");
        }
    }

    @Test
    void listPostsReportsWhenTableIsEmpty() throws Exception {
        String databaseName = "db-demo-empty-" + UUID.randomUUID().toString().replace("-", "");
        ByteArrayOutputStream capturedOutput = new ByteArrayOutputStream();
        PrintStream originalOutput = System.out;

        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:" + databaseName);
                Statement statement = connection.createStatement();
                PrintStream testOutput = new PrintStream(capturedOutput, true, StandardCharsets.UTF_8)) {
            statement.execute("CREATE TABLE posts (id BIGINT PRIMARY KEY, title VARCHAR(255), created_at VARCHAR(16))");
            System.setOut(testOutput);
            invokePrivate("listPosts", new Class<?>[] { Connection.class }, connection);
        } finally {
            System.setOut(originalOutput);
        }

        assertTrue(capturedOutput.toString(StandardCharsets.UTF_8).contains("등록된 글이 없습니다"));
    }

    private static Object invokePrivate(String methodName, Class<?>[] parameterTypes, Object... arguments)
            throws Exception {
        Method method = DbDemo.class.getDeclaredMethod(methodName, parameterTypes);
        method.setAccessible(true);
        return method.invoke(null, arguments);
    }
}