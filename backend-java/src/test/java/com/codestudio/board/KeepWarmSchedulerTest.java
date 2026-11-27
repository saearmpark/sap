package com.codestudio.board;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KeepWarmSchedulerTest {

    @Test
    void pingsStatusEndpoint() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/news/status", exchange -> {
            hits.incrementAndGet();
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.start();
        try {
            String baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/";
            // 조용한 시간을 끄고(0, 0) 언제 실행해도 핑을 보내는지 확인합니다.
            KeepWarmScheduler scheduler = new KeepWarmScheduler(baseUrl, "", "", true, 0, 0);
            scheduler.ping();
            assertEquals(1, hits.get());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void skipsPingWhenDisabled() {
        KeepWarmScheduler scheduler = new KeepWarmScheduler("https://example.com", "", "", false, 2, 7);
        scheduler.ping();
    }

    @Test
    void skipsPingWithoutPublicUrl() {
        KeepWarmScheduler scheduler = new KeepWarmScheduler("", "", "", true, 2, 7);
        scheduler.ping();
    }

    @Test
    void treatsNightHoursAsQuiet() {
        // 기본값: 새벽 2시부터 7시 전까지는 접속을 멈춰 서버가 잠들게 합니다.
        assertFalse(KeepWarmScheduler.isQuietHour(1, 2, 7));
        assertTrue(KeepWarmScheduler.isQuietHour(2, 2, 7));
        assertTrue(KeepWarmScheduler.isQuietHour(6, 2, 7));
        assertFalse(KeepWarmScheduler.isQuietHour(7, 2, 7));
        assertFalse(KeepWarmScheduler.isQuietHour(12, 2, 7));
    }

    @Test
    void disablesQuietHoursWhenStartEqualsEnd() {
        for (int hour = 0; hour < 24; hour++) {
            assertFalse(KeepWarmScheduler.isQuietHour(hour, 0, 0));
        }
    }

    @Test
    void handlesQuietWindowAcrossMidnight() {
        assertTrue(KeepWarmScheduler.isQuietHour(23, 22, 6));
        assertTrue(KeepWarmScheduler.isQuietHour(3, 22, 6));
        assertFalse(KeepWarmScheduler.isQuietHour(12, 22, 6));
        assertFalse(KeepWarmScheduler.isQuietHour(6, 22, 6));
    }
}
