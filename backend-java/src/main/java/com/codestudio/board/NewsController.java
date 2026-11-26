package com.codestudio.board;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    // 프런트가 5분마다 조회하므로, 1시간이 지난 소식은 다음 조회 때 백그라운드로 갱신합니다.
    private static final Duration STALE_AFTER = Duration.ofHours(1);
    private static final List<String> CATEGORIES = List.of("국내", "경제");

    private final NewsItemRepository repository;
    private final NewsCollector collector;

    public NewsController(NewsItemRepository repository, NewsCollector collector) {
        this.repository = repository;
        this.collector = collector;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(name = "category", required = false) String category) {
        collector.refreshIfStaleAsync(STALE_AFTER);
        List<NewsItem> items = (category == null || category.isBlank())
                ? repository.findTop20ByOrderByIdDesc()
                : repository.findTop20ByCategoryOrderByIdDesc(category);
        return items.stream()
                .map(item -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", item.getId());
                    row.put("title", item.getTitle());
                    row.put("link", item.getLink());
                    row.put("source", item.getSource());
                    row.put("category", item.getCategory());
                    row.put("summary", item.getSummary());
                    row.put("imageUrl", item.getImageUrl());
                    row.put("publishedAt", item.getPublishedAt() == null ? null : item.getPublishedAt().toString());
                    row.put("fetchedAt", item.getFetchedAt().toString());
                    return row;
                })
                .toList();
    }

    // GitHub Actions가 1시간마다 호출해 서버를 깨우고 소식을 즉시 갱신합니다.
    @PostMapping("/refresh")
    public Map<String, Object> refresh() {
        NewsCollector.RefreshSummary summary = collector.refreshNow();
        Map<String, Object> body = status();
        body.put("refreshed", summary != null);
        if (summary != null) {
            body.put("added", summary.added());
            body.put("trimmed", summary.trimmed());
            body.put("staleRemoved", summary.staleRemoved());
            body.put("feedsSucceeded", summary.feedsSucceeded());
            body.put("feedsFailed", summary.feedsFailed());
            body.put("healthy", summary.healthy());
        }
        return body;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        Instant latest = collector.latestFetchedAt();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("lastRefreshAt", collector.lastRefreshAt() == null ? null : collector.lastRefreshAt().toString());
        body.put("latestFetchedAt", latest == null ? null : latest.toString());
        body.put("stale", NewsCollector.isStale(latest, STALE_AFTER, Instant.now()));
        body.put("refreshing", collector.isRefreshing());
        body.put("maxAgeMinutes", STALE_AFTER.toMinutes());
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String name : CATEGORIES) {
            counts.put(name, repository.countByCategory(name));
        }
        body.put("counts", counts);
        body.put("feedFailures", collector.lastFeedFailures());
        return body;
    }
}
