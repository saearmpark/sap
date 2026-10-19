package com.codestudio.board;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// 무료 RSS·검색 피드(정치·사회, 증시·금리·환율·가상자산·미국 증시·연준)를 10분마다 수집해 소식을 자동으로 게시합니다.
// 분류(국내·경제)별로 최신 20건만 남기고 오래된 소식은 다음 수집 때 삭제합니다.
// 같은 사건을 다룬 제목이 중복되지 않도록 정규화한 제목으로 거릅니다.
@Component
public class NewsCollector {

    private static final Logger log = LoggerFactory.getLogger(NewsCollector.class);
    private static final int KEEP_ITEMS = 20;
    private static final List<String> CATEGORIES = List.of("국내", "경제");
    private static final Pattern IMAGE_PATTERN =
            Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);

    private record Feed(String url, String category, String name, int limit) {
    }

    private static final List<Feed> FEEDS = List.of(
            new Feed("https://www.yna.co.kr/rss/politics.xml", "국내", "연합뉴스", 10),
            new Feed("https://www.yna.co.kr/rss/society.xml", "국내", "연합뉴스", 10),
            new Feed("https://www.yna.co.kr/rss/market.xml", "경제", "연합뉴스", 2),
            new Feed("https://news.google.com/rss/search?q=%EC%A6%9D%EC%8B%9C&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%EA%B8%88%EB%A6%AC&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%ED%99%98%EC%9C%A8&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%EA%B0%80%EC%83%81%EC%9E%90%EC%82%B0&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%EB%AF%B8%EA%B5%AD%20%EC%A6%9D%EC%8B%9C&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3),
            new Feed("https://news.google.com/rss/search?q=%EC%97%B0%EC%A4%80&hl=ko&gl=KR&ceid=KR:ko", "경제", "Google 뉴스", 3));

    private final NewsItemRepository repository;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public NewsCollector(NewsItemRepository repository) {
        this.repository = repository;
    }

    @Scheduled(fixedRate = 10 * 60 * 1000L, initialDelay = 15 * 1000L)
    @Transactional
    public void refresh() {
        Map<String, Set<String>> seenTitles = new HashMap<>();
        for (String category : CATEGORIES) {
            Set<String> titles = new HashSet<>();
            for (NewsItem item : repository.findTop20ByCategoryOrderByIdDesc(category)) {
                titles.add(normalizeTitle(item.getTitle()));
            }
            seenTitles.put(category, titles);
        }
        int added = 0;
        for (Feed feed : FEEDS) {
            added += collect(feed, seenTitles.get(feed.category()));
        }
        int removed = trimToNewest();
        if (added > 0 || removed > 0) {
            log.info("News refresh: {} added, {} removed", added, removed);
        }
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

    private int collect(Feed feed, Set<String> seenTitles) {
        Document doc;
        try {
            doc = fetch(feed.url());
        } catch (Exception error) {
            log.warn("Could not load news feed {}: {}", feed.url(), error.getMessage());
            return 0;
        }
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
            String normalizedTitle = normalizeTitle(title);
            if (normalizedTitle.isEmpty() || !seenTitles.add(normalizedTitle)) {
                continue;
            }
            String hash = sha256(link);
            if (repository.existsByLinkHash(hash)) {
                continue;
            }
            String source = clean(text(item, "source"), 80);
            if (source.isEmpty()) {
                source = feed.name();
            }
            repository.save(new NewsItem(
                    title,
                    link,
                    hash,
                    source,
                    feed.category(),
                    summary(text(item, "description")),
                    imageUrl(extractImage(item)),
                    parseDate(text(item, "pubDate")),
                    now));
            added++;
            if (feed.limit() > 0 && added >= feed.limit()) {
                break;
            }
        }
        return added;
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
    private static String normalizeTitle(String title) {
        String text = title == null ? "" : title;
        int sourceSep = text.lastIndexOf(" - ");
        if (sourceSep > 0) {
            text = text.substring(0, sourceSep);
        }
        return text.replaceAll("[^\\p{L}\\p{N}]", "").toLowerCase(Locale.ROOT);
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
}
