package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

// Yahoo Finance 차트 API에서 국내·미국·기타 시세를 받아 30초간 캐시해 제공합니다.
@Service
public class StockQuoteService {

    private static final Logger log = LoggerFactory.getLogger(StockQuoteService.class);
    private static final long CACHE_MILLIS = 30_000L;
    private static final int SPARK_POINTS = 40;
    private static final String BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";

    private record Symbol(String symbol, String name, String group) {
    }

    private static final List<Symbol> SYMBOLS = List.of(
            new Symbol("005930.KS", "삼성전자", "국내"),
            new Symbol("000660.KS", "SK하이닉스", "국내"),
            new Symbol("069500.KS", "KODEX 200", "국내"),
            new Symbol("^IXIC", "나스닥 지수", "미국"),
            new Symbol("^GSPC", "S&P 500 지수", "미국"),
            new Symbol("NVDA", "엔비디아", "미국"),
            new Symbol("GOOGL", "알파벳 A", "미국"),
            new Symbol("AAPL", "애플", "미국"),
            new Symbol("GLD", "금 ETF", "기타"),
            new Symbol("BTC-USD", "비트코인", "기타"),
            new Symbol("KRW=X", "원/달러 환율", "기타"),
            new Symbol("CL=F", "WTI 유가", "기타"));

    public record Board(List<Map<String, Object>> quotes, Instant updatedAt) {
    }

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private volatile Board cache;

    public Board quotes() {
        Board current = cache;
        long now = System.currentTimeMillis();
        if (current != null && now - current.updatedAt().toEpochMilli() < CACHE_MILLIS) {
            return current;
        }
        List<Map<String, Object>> rows = fetchAll();
        if (rows.isEmpty()) {
            return current != null ? current : new Board(List.of(), Instant.now());
        }
        Board fresh = new Board(rows, Instant.now());
        cache = fresh;
        return fresh;
    }

    private List<Map<String, Object>> fetchAll() {
        List<CompletableFuture<Map<String, Object>>> pending = new ArrayList<>();
        for (Symbol symbol : SYMBOLS) {
            pending.add(http.sendAsync(request(symbol), HttpResponse.BodyHandlers.ofString())
                    .thenApply(response -> parse(symbol, response))
                    .exceptionally(error -> {
                        log.warn("Could not load quote {}: {}", symbol.symbol(), error.getMessage());
                        return null;
                    }));
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        for (CompletableFuture<Map<String, Object>> future : pending) {
            try {
                Map<String, Object> row = future.join();
                if (row != null) {
                    rows.add(row);
                }
            } catch (Exception error) {
                log.warn("Quote task failed: {}", error.getMessage());
            }
        }
        return rows;
    }

    private HttpRequest request(Symbol symbol) {
        String url = BASE + URLEncoder.encode(symbol.symbol(), StandardCharsets.UTF_8) + "?interval=5m&range=1d";
        return HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("User-Agent", "Mozilla/5.0 (compatible; SapStockBot/1.0)")
                .header("Accept", "application/json")
                .GET()
                .build();
    }

    private Map<String, Object> parse(Symbol symbol, HttpResponse<String> response) {
        if (response.statusCode() != 200) {
            throw new IllegalStateException("HTTP " + response.statusCode());
        }
        try {
            JsonNode result = mapper.readTree(response.body()).path("chart").path("result");
            if (!result.isArray() || result.isEmpty() || result.get(0).isNull()) {
                return null;
            }
            JsonNode data = result.get(0);
            JsonNode meta = data.path("meta");
            List<Double> spark = closes(data);
            double price = number(meta, "regularMarketPrice", spark.isEmpty() ? Double.NaN : spark.get(spark.size() - 1));
            if (!Double.isFinite(price)) {
                return null;
            }
            double previousClose = number(meta, "chartPreviousClose", number(meta, "previousClose", price));
            double change = price - previousClose;
            double changePercent = meta.hasNonNull("regularMarketChangePercent")
                    ? meta.path("regularMarketChangePercent").asDouble()
                    : (previousClose == 0 ? 0 : change / previousClose * 100);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("symbol", symbol.symbol());
            row.put("name", symbol.name());
            row.put("group", symbol.group());
            row.put("price", round(price));
            row.put("change", round(change));
            row.put("changePercent", round(changePercent));
            row.put("previousClose", round(previousClose));
            row.put("currency", meta.path("currency").asText(""));
            row.put("marketTime", meta.hasNonNull("regularMarketTime") ? meta.path("regularMarketTime").asLong() : null);
            row.put("spark", spark);
            return row;
        } catch (Exception error) {
            log.warn("Could not parse quote {}: {}", symbol.symbol(), error.getMessage());
            return null;
        }
    }

    private List<Double> closes(JsonNode data) {
        List<Double> values = new ArrayList<>();
        JsonNode close = data.path("indicators").path("quote").path(0).path("close");
        if (close.isArray()) {
            for (JsonNode point : close) {
                if (point.isNumber()) {
                    values.add(round(point.asDouble()));
                }
            }
        }
        if (values.size() > SPARK_POINTS) {
            return new ArrayList<>(values.subList(values.size() - SPARK_POINTS, values.size()));
        }
        return values;
    }

    private static double number(JsonNode meta, String field, double fallback) {
        JsonNode node = meta.path(field);
        return node.isNumber() ? node.asDouble() : fallback;
    }

    private static double round(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }
}
