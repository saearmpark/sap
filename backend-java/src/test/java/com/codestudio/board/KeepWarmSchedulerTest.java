package com.codestudio.board;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
            KeepWarmScheduler scheduler = new KeepWarmScheduler(baseUrl, "", "", true);
            scheduler.ping();
            assertEquals(1, hits.get());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void skipsPingWhenDisabled() {
        KeepWarmScheduler scheduler = new KeepWarmScheduler("https://example.com", "", "", false);
        scheduler.ping();
    }

    @Test
    void skipsPingWithoutPublicUrl() {
        KeepWarmScheduler scheduler = new KeepWarmScheduler("", "", "", true);
        scheduler.ping();
    }
}
