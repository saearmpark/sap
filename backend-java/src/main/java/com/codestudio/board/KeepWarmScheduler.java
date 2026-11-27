package com.codestudio.board;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Render 무료 인스턴스는 15분 동안 요청이 없으면 잠들어 첫 방문이 1~2분 걸립니다.
 * Render가 제공하는 공개 주소로 주기적으로 요청을 보내 인스턴스를 깨어 있게 유지합니다.
 * 로컬·CI처럼 RENDER_EXTERNAL_URL이 없으면 아무 것도 하지 않습니다.
 */
@Component
public class KeepWarmScheduler {

    private static final Logger log = LoggerFactory.getLogger(KeepWarmScheduler.class);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final HttpClient http;
    private final String statusUrl;

    public KeepWarmScheduler(
            @Value("${RENDER_EXTERNAL_URL:}") String publicUrl,
            @Value("${RENDER_EXTERNAL_HOSTNAME:}") String publicHost,
            @Value("${RENDER:}") String onRender,
            @Value("${sap.keep-warm.enabled:true}") boolean enabled) {
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        String baseUrl = publicUrl == null ? "" : publicUrl.trim();
        if (baseUrl.isBlank() && publicHost != null && !publicHost.isBlank()) {
            baseUrl = "https://" + publicHost.trim();
        }
        if (baseUrl.isBlank() && "true".equalsIgnoreCase(onRender)) {
            baseUrl = "https://board-backend-nngx.onrender.com";
        }
        if (!enabled || baseUrl.isBlank()) {
            this.statusUrl = null;
            return;
        }
        this.statusUrl = baseUrl.replaceAll("/+$", "") + "/api/news/status";
        log.info("Keep-warm scheduler enabled for {}", this.statusUrl);
    }

    // 8분마다 상태 API를 호출해 Render가 인스턴스를 재우지 않게 합니다.
    @Scheduled(initialDelay = 60_000L, fixedDelay = 8 * 60 * 1000L)
    public void ping() {
        if (statusUrl == null) {
            return;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(statusUrl))
                    .timeout(REQUEST_TIMEOUT)
                    .header("User-Agent", "sap-keep-warm")
                    .GET()
                    .build();
            int code = http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (code >= 400) {
                log.warn("Keep-warm ping returned HTTP {}", code);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.debug("Keep-warm ping failed: {}", e.getMessage());
        }
    }
}
