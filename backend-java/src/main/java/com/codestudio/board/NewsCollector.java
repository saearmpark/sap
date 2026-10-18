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
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// 무료 RSS(정치·경제·산업·사회 섹션)를 10분마다 수집해 스포츠·연예를 제외한 국내 핫이슈 소식을 자동으로 게시합니다.
// 최신 20건만 남기고 오래된 소식은 다음 수집 때 삭제합니다.
@Component
public class NewsCollector {

    private static final Logger log = LoggerFactory.getLogger(NewsCollector.class);
    private static final int KEEP_ITEMS = 20;
    private static final Pattern IMAGE_PATTERN =
            Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);

    private record Feed(String url, String category, String name) {
    }

    private static final List<Feed> FEEDS = List.of(
            new Feed("https://news.google.com/rss/headlines/section/topic/NATION?hl=ko&gl=KR&ceid=KR:ko", "국내", "Google 뉴스"),
            new Feed("https://www.yna.co.kr/rss/politics.xml", "국내", "연합뉴스"),
            new Feed("https://www.yna.co.kr/rss/economy.xml", "국내", "연합뉴스"),
            new Feed("https://www.yna.co.kr/rss/industry.xml", "국내", "연합뉴스"),
            new Feed("https://www.yna.co.kr/rss/society.xml", "국내", "연합뉴스"));

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
        int added = 0;
        for (Feed feed : FEEDS) {
            added += collect(feed);
        }
        int removed = trimToNewest();
        if (added > 0 || removed > 0) {
            log.info("News refresh: {} added, {} removed", added, removed);
        }
    }

    private int trimToNewest() {
        List<NewsItem> newest = repository.findTop20ByOrderByIdDesc();
        if (newest.size() < KEEP_ITEMS) {
            return 0;
        }
        long cutoff = newest.get(newest.size() - 1).getId();
        return repository.deleteByIdLessThan(cutoff);
    }

    private int collect(Feed feed) {
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
