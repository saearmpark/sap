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
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Render 무료 인스턴스는 15분 동안 요청이 없으면 잠들어 첫 방문이 1~2분 걸립니다.
 * Render가 제공하는 공개 주소로 주기적으로 요청을 보내 인스턴스를 깨어 있게 유지합니다.
 * 로컬·CI처럼 RENDER_EXTERNAL_URL이 없으면 아무 것도 하지 않습니다.
 *
 * 무료 플랜은 월 750시간이라 24시간 깨어 있으면 한도에 거의 닿습니다.
 * 그래서 새벽 2시~7시(한국시간)에는 접속을 멈춰 서버가 잠들게 두고, 월 사용 시간을 약 150시간 아낍니다.
 */
@Component
public class KeepWarmScheduler {

    private static final Logger log = LoggerFactory.getLogger(KeepWarmScheduler.class);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final HttpClient http;
    private final String statusUrl;
    private final int quietStartHour;
    private final int quietEndHour;
    private volatile boolean quietSkipLogged;

    public KeepWarmScheduler(
            @Value("${RENDER_EXTERNAL_URL:}") String publicUrl,
            @Value("${RENDER_EXTERNAL_HOSTNAME:}") String publicHost,
            @Value("${RENDER:}") String onRender,
            @Value("${sap.keep-warm.enabled:true}") boolean enabled,
            @Value("${sap.keep-warm.quiet-start-hour:2}") int quietStartHour,
            @Value("${sap.keep-warm.quiet-end-hour:7}") int quietEndHour) {
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.quietStartHour = quietStartHour;
        this.quietEndHour = quietEndHour;
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
        log.info("Keep-warm scheduler enabled for {} (quiet hours {}-{} KST)",
                this.statusUrl, quietStartHour, quietEndHour);
    }

    // 8분마다 상태 API를 호출해 Render가 인스턴스를 재우지 않게 합니다.
    @Scheduled(initialDelay = 60_000L, fixedDelay = 8 * 60 * 1000L)
    public void ping() {
        if (statusUrl == null) {
            return;
        }
        if (isQuietHour(ZonedDateTime.now(KST).getHour(), quietStartHour, quietEndHour)) {
            if (!quietSkipLogged) {
                log.info("Keep-warm paused during quiet hours ({}:00-{}:00 KST)", quietStartHour, quietEndHour);
                quietSkipLogged = true;
            }
            return;
        }
        quietSkipLogged = false;
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

    /** start와 end가 같으면 조용한 시간 없이 항상 깨어 있게 합니다. 자정을 넘는 구간도 처리합니다. */
    static boolean isQuietHour(int hour, int start, int end) {
        if (start == end) {
            return false;
        }
        if (start < end) {
            return hour >= start && hour < end;
        }
        return hour >= start || hour < end;
    }
}
