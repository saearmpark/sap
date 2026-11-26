package com.codestudio.board;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// 무료 RSS·검색 피드(정치·사회, 증시·금리·환율·가상자산·미국 증시·연준)를 10분마다 수집해 소식을 자동으로 게시합니다.
// 분류(국내·경제)별로 최신 20건만 남기고 오래된 소식은 다음 수집 때 삭제합니다.
// 같은 사건을 다룬 제목이 중복되지 않도록 정규화한 제목으로 거릅니다.
@Component
public class NewsCollector {

    private static final Logger log = LoggerFactory.getLogger(NewsCollector.class);
    private static final int KEEP_ITEMS = 20;
    private static final Duration ECONOMIC_NEWS_MAX_AGE = Duration.ofDays(7);
    // 연속 요청으로 피드를 반복 호출하지 않도록 최소 5분 간격을 둡니다.
    private static final Duration MIN_REFRESH_INTERVAL = Duration.ofMinutes(5);
    private static final List<String> CATEGORIES = List.of("국내", "경제");
    private static final Pattern IMAGE_PATTERN =
            Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);

    private record Feed(String url, String category, String name, int limit) {
    }

    private record Collected(List<NewsItem> items, List<String> failures, int successes) {
    }

    private record Applied(int added, int trimmed, int staleRemoved) {
    }

    /** 한 번의 갱신 결과입니다. healthy는 피드 하나 이상을 정상적으로 읽었다는 뜻입니다. */
    public record RefreshSummary(int added, int trimmed, int staleRemoved,
                                 int feedsSucceeded, int feedsFailed) {
        public boolean healthy() {
            return feedsSucceeded > 0;
        }
    }

    private static final List<Feed> FEEDS = List.of(
            new Feed("https://www.yna.co.kr/rss/politics.xml", "국내", "연합뉴스", 10),
            new Feed("https://www.yna.co.kr/rss/society.xml", "국내", "연합뉴스", 10),
            new Feed("https://www.yna.co.kr/rss/market.xml", "경제", "연합뉴스", 2),
            new Feed("https://news.google.com/rss/search?q=%EC%A6%9D%EC%8B%9C%20when%3A1d&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%EA%B8%88%EB%A6%AC%20when%3A1d&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%ED%99%98%EC%9C%A8%20when%3A1d&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%EA%B0%80%EC%83%81%EC%9E%90%EC%82%B0%20when%3A1d&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%EB%AF%B8%EA%B5%AD%20%EC%A6%9D%EC%8B%9C%20when%3A1d&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%EC%97%B0%EC%A4%80%20when%3A1d&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3));

    private final NewsItemRepository repository;
    private final TransactionTemplate transactionTemplate;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final ExecutorService refreshExecutor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "news-refresh");
        thread.setDaemon(true);
        return thread;
    });
    private final AtomicBoolean refreshing = new AtomicBoolean(false);
    private volatile Instant lastRefreshAt;
    private volatile List<String> lastFeedFailures = List.of();

    public NewsCollector(NewsItemRepository repository, PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Scheduled(fixedRate = 10 * 60 * 1000L, initialDelay = 15 * 1000L)
    public void refresh() {
        refreshNow();
    }

    /**
     * 피드를 수집해 새 소식을 저장합니다. 이미 갱신 중이거나 최근 5분 안에 성공한 갱신이 있으면
     * null을 반환합니다. 저장은 네트워크 수집이 끝난 뒤 한 트랜잭션으로 처리합니다.
     */
    public RefreshSummary refreshNow() {
        if (!canRefresh(MIN_REFRESH_INTERVAL)) {
            return null;
        }
        if (!refreshing.compareAndSet(false, true)) {
            return null;
        }
        try {
            return doRefresh();
        } finally {
            refreshing.set(false);
        }
    }

    /** 데이터가 오래됐고 갱신 중이 아니면 백그라운드 갱신을 시작합니다. */
    public boolean refreshIfStaleAsync(Duration maxAge) {
        if (!isStale(maxAge)) {
            return false;
        }
        return refreshAsync();
    }

    /** 갱신 중이 아니면 백그라운드 갱신 스레드에 작업을 넣습니다. */
    public boolean refreshAsync() {
        if (!canRefresh(MIN_REFRESH_INTERVAL)) {
            return false;
        }
        if (!refreshing.compareAndSet(false, true)) {
            return false;
        }
        try {
            refreshExecutor.execute(() -> {
                try {
                    doRefresh();
                } finally {
                    refreshing.set(false);
                }
            });
        } catch (RuntimeException error) {
            refreshing.set(false);
            log.warn("Could not schedule news refresh: {}", error.getMessage());
            return false;
        }
        return true;
    }

    /** 마지막 성공 갱신 시각과 DB에 저장된 최신 수집 시각 중 더 최근 값입니다. */
    public Instant latestFetchedAt() {
        Instant latest = lastRefreshAt;
        Instant stored = repository.findMaxFetchedAt();
        if (stored != null && (latest == null || stored.isAfter(latest))) {
            latest = stored;
        }
        return latest;
    }

    public boolean isStale(Duration maxAge) {
        return isStale(latestFetchedAt(), maxAge, Instant.now());
    }

    public static boolean isStale(Instant latest, Duration maxAge, Instant now) {
        return latest == null || latest.isBefore(now.minus(maxAge));
    }

    public boolean canRefresh(Duration minInterval) {
        Instant last = lastRefreshAt;
        return last == null || !last.isAfter(Instant.now().minus(minInterval));
    }

    public boolean isRefreshing() {
        return refreshing.get();
    }

    public Instant lastRefreshAt() {
        return lastRefreshAt;
    }

    public List<String> lastFeedFailures() {
        return lastFeedFailures;
    }

    private RefreshSummary doRefresh() {
        Collected collected;
        try {
            collected = collectFeeds();
        } catch (RuntimeException error) {
            log.warn("News refresh failed while reading feeds: {}", error.getMessage());
            return new RefreshSummary(0, 0, 0, 0, FEEDS.size());
        }

        Applied applied;
        try {
            applied = transactionTemplate.execute(status -> apply(collected.items()));
        } catch (RuntimeException error) {
            log.warn("News refresh failed while saving: {}", error.getMessage());
            return new RefreshSummary(0, 0, 0, collected.successes(),
                    collected.failures().size() + 1);
        }
        if (applied == null) {
            return new RefreshSummary(0, 0, 0, collected.successes(), collected.failures().size());
        }

        lastFeedFailures = List.copyOf(collected.failures());
        RefreshSummary summary = new RefreshSummary(applied.added(), applied.trimmed(),
                applied.staleRemoved(), collected.successes(), collected.failures().size());
        if (summary.healthy()) {
            // 일부 피드가 실패해도 성공한 피드가 있으면 갱신된 것으로 봅니다.
            lastRefreshAt = Instant.now();
        }
        if (applied.added() > 0 || applied.trimmed() > 0 || applied.staleRemoved() > 0
                || !collected.failures().isEmpty()) {
            log.info("News refresh: {} added, {} trimmed, {} stale removed, {} feeds ok, {} failed",
                    applied.added(), applied.trimmed(), applied.staleRemoved(),
                    collected.successes(), collected.failures().size());
        }
        return summary;
    }

    private Collected collectFeeds() {
        Map<String, Set<String>> seenTitles = new HashMap<>();
        for (String category : CATEGORIES) {
            Set<String> titles = new HashSet<>();
            for (NewsItem item : repository.findTop20ByCategoryOrderByIdDesc(category)) {
                titles.add(normalizeTitle(item.getTitle()));
            }
            seenTitles.put(category, titles);
        }

        List<NewsItem> items = new ArrayList<>();
        Set<String> seenHashes = new HashSet<>();
        List<String> failures = new ArrayList<>();
        int successes = 0;
        for (Feed feed : FEEDS) {
            try {
                collect(feed, seenTitles.get(feed.category()), seenHashes, items);
                successes++;
            } catch (Exception error) {
                String message = error.getMessage() == null
                        ? error.getClass().getSimpleName()
                        : error.getMessage();
                log.warn("Could not load news feed {}: {}", feed.url(), message);
                failures.add(feed.name() + ": " + message);
            }
        }
        return new Collected(items, failures, successes);
    }

    private Applied apply(List<NewsItem> candidates) {
        int staleRemoved = repository.deleteStaleByCategory("경제", Instant.now().minus(ECONOMIC_NEWS_MAX_AGE));
        int added = 0;
        for (NewsItem candidate : candidates) {
            if (repository.existsByLinkHash(candidate.getLinkHash())) {
                continue;
            }
            repository.save(candidate);
            added++;
        }
        int trimmed = trimToNewest();
        return new Applied(added, trimmed, staleRemoved);
    }

    private int trimToNewest() {
        int removed = 0;
        for (String category : CATEGORIES) {
            List<NewsItem> newest = repository.findTop20ByCategoryOrderByIdDesc(category);
            if (newest.size() < KEEP_ITEMS) {
                continue;
            }
            long cutoff = newest.get(newest.size() - 1).getId();
            removed += repository.deleteByCategoryAndIdLessThan(category, cutoff);
        }
        return removed;
    }

    private void collect(Feed feed, Set<String> seenTitles, Set<String> seenHashes,
                         List<NewsItem> out) throws Exception {
        Document doc = fetch(feed.url());
        NodeList items = doc.getElementsByTagName("item");
        Instant now = Instant.now();
        int added = 0;
        for (int i = 0; i < items.getLength(); i++) {
            Node node = items.item(i);
            if (node.getNodeType() != Node.ELEMENT_NODE) {
                continue;
            }
            Element item = (Element) node;
            String title = clean(text(item, "title"), 300);
            String link = clean(text(item, "link"), 1000);
            if (title.isEmpty() || link.isEmpty()) {
                continue;
            }
            Instant publishedAt = parseDate(text(item, "pubDate"));
            if ("경제".equals(feed.category()) && !isFreshEconomicArticle(publishedAt, now)) {
                continue;
            }
            String normalizedTitle = normalizeTitle(title);
            if (normalizedTitle.isEmpty() || !seenTitles.add(normalizedTitle)) {
                continue;
            }
            String hash = sha256(link);
            if (seenHashes.contains(hash) || repository.existsByLinkHash(hash)) {
                continue;
            }
            String source = clean(text(item, "source"), 80);
            if (source.isEmpty()) {
                source = feed.name();
            }
            seenHashes.add(hash);
            out.add(new NewsItem(
                    title,
                    link,
                    hash,
                    source,
                    feed.category(),
                    summary(text(item, "description")),
                    imageUrl(extractImage(item)),
                    publishedAt,
                    now));
            added++;
            if (feed.limit() > 0 && added >= feed.limit()) {
                break;
            }
        }
    }

    private Document fetch(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header("User-Agent", "Mozilla/5.0 (compatible; SapNewsBot/1.0)")
                .header("Accept", "application/rss+xml, application/xml, text/xml")
                .GET()
                .build();
        HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("HTTP " + response.statusCode());
        }
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setExpandEntityReferences(false);
        factory.setNamespaceAware(false);
        return factory.newDocumentBuilder().parse(new ByteArrayInputStream(response.body()));
    }

    private static String text(Element item, String tag) {
        NodeList nodes = item.getElementsByTagName(tag);
        return nodes.getLength() == 0 ? "" : nodes.item(0).getTextContent();
    }

    private static String clean(String value, int maxLength) {
        String text = value == null ? "" : value.replaceAll("<[^>]+>", " ");
        text = text.replaceAll("\\s+", " ").trim();
        return text.length() > maxLength ? text.substring(0, maxLength) : text;
    }

    // "제목 - 매체" 형태의 출처 꼬리표와 문장부호·공백을 제거해 같은 사건의 중복 제목을 가려냅니다.
    static String normalizeTitle(String title) {
        String text = title == null ? "" : title;
        int sourceSep = text.lastIndexOf(" - ");
        if (sourceSep > 0) {
            text = text.substring(0, sourceSep);
        }
        return text.replaceAll("[^\\p{L}\\p{N}]", "").toLowerCase(Locale.ROOT);
    }

    static boolean isFreshEconomicArticle(Instant publishedAt, Instant now) {
        return publishedAt != null && !publishedAt.isBefore(now.minus(ECONOMIC_NEWS_MAX_AGE));
    }

    private static String summary(String description) {
        if (description == null) {
            return "";
        }
        if (description.contains("<a ") || description.contains("<ol") || description.contains("<li")) {
            return "";
        }
        return clean(description, 300);
    }

    private static String extractImage(Element item) {
        String url = attribute(item, "media:content", "url");
        if (url.isEmpty()) {
            url = attribute(item, "media:thumbnail", "url");
        }
        if (url.isEmpty()) {
            Element enclosure = firstElement(item, "enclosure");
            if (enclosure != null) {
                String type = enclosure.getAttribute("type");
                if (type.isEmpty() || type.toLowerCase().startsWith("image")) {
                    url = enclosure.getAttribute("url");
                }
            }
        }
        if (url.isEmpty()) {
            url = firstImage(text(item, "content:encoded"));
        }
        if (url.isEmpty()) {
            url = firstImage(text(item, "description"));
        }
        return url;
    }

    private static String imageUrl(String raw) {
        String url = clean(raw, 1000);
        if (url.startsWith("//")) {
            url = "https:" + url;
        }
        boolean supported = url.startsWith("http://") || url.startsWith("https://");
        return supported ? url : "";
    }

    private static String attribute(Element item, String tag, String name) {
        Element element = firstElement(item, tag);
        return element == null ? "" : element.getAttribute(name);
    }

    private static Element firstElement(Element item, String tag) {
        NodeList nodes = item.getElementsByTagName(tag);
        if (nodes.getLength() == 0) {
            return null;
        }
        Node node = nodes.item(0);
        return node.getNodeType() == Node.ELEMENT_NODE ? (Element) node : null;
    }

    private static String firstImage(String html) {
        if (html == null || html.isEmpty()) {
            return "";
        }
        Matcher matcher = IMAGE_PATTERN.matcher(html);
        return matcher.find() ? matcher.group(1) : "";
    }

    private static Instant parseDate(String value) {
        try {
            return ZonedDateTime.parse(value.trim(), DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
        } catch (Exception error) {
            return null;
        }
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (Exception error) {
            return Integer.toHexString(value.hashCode());
        }
    }

    @PreDestroy
    void shutdown() {
        refreshExecutor.shutdownNow();
    }
}
