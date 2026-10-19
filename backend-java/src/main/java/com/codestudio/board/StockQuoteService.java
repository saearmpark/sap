package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

// 네이버·CNBC·업비트 시세 API에서 국내·미국 대표 종목, 환율, 코인, 원자재 시세를 받아 10초간 캐시해 제공합니다.
// 야후 파이낸스는 일부 클라우드 IP를 차단해 국내(네이버)·미국(CNBC)·코인(업비트)으로 나눠 조회합니다.
@Service
public class StockQuoteService {

    private static final Logger log = LoggerFactory.getLogger(StockQuoteService.class);
    private static final long CACHE_MILLIS = 10_000L;

    private static final String CNBC_URL = "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol"
            + "?symbols=NVDA%7CAAPL%7CGOOGL%7CSPY%7CQQQ%7CGLD%7C%40CL.1"
            + "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1";
    private static final String NAVER_KR_URL =
            "https://polling.finance.naver.com/api/realtime/domestic/stock/005930,000660,402340,069500";
    private static final String NAVER_FX_URL = "https://api.stock.naver.com/marketindex/exchange/";
    private static final List<String> FX_CODES = List.of("FX_USDKRW");
    private static final String UPBIT_URL =
            "https://api.upbit.com/v1/ticker?markets=KRW-BTC";

    private record Info(String name, String code, String group, String unit) {
    }

    private static final Map<String, Info> INFO = new LinkedHashMap<>();
    private static final List<String> ORDER = List.of(
            "005930", "000660", "402340", "069500",
            "NVDA", "AAPL", "GOOGL", "SPY", "QQQ",
            "FX_USDKRW",
            "BTC",
            "GLD", "CL.F");

    static {
        INFO.put("005930", new Info("삼성전자", "005930", "국내", "KRW"));
        INFO.put("000660", new Info("SK하이닉스", "000660", "국내", "KRW"));
        INFO.put("402340", new Info("SK스퀘어", "402340", "국내", "KRW"));
        INFO.put("069500", new Info("KODEX 200", "069500", "국내", "KRW"));

        INFO.put("NVDA", new Info("엔비디아", "NVDA", "미국", "USD"));
        INFO.put("AAPL", new Info("애플", "AAPL", "미국", "USD"));
        INFO.put("GOOGL", new Info("알파벳 A", "GOOGL", "미국", "USD"));
        INFO.put("SPY", new Info("S&P 500 ETF", "SPY", "미국", "USD"));
        INFO.put("QQQ", new Info("나스닥 100 ETF", "QQQ", "미국", "USD"));

        INFO.put("FX_USDKRW", new Info("원/달러", "USD/KRW", "환율", "KRW"));

        INFO.put("BTC", new Info("비트코인", "BTC", "코인", "KRW"));

        INFO.put("GLD", new Info("금 ETF", "GLD", "기타", "USD"));
        INFO.put("CL.F", new Info("WTI 유가", "WTI", "기타", "USD"));
    }

    public record Board(List<Map<String, Object>> quotes, Instant updatedAt) {
    }

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private volatile Board cache;
    private volatile long cachedAt;

    public Board quotes() {
        Board current = cache;
        if (current != null && System.currentTimeMillis() - cachedAt < CACHE_MILLIS) {
            return current;
        }
        Map<String, Map<String, Object>> collected = new LinkedHashMap<>();
        List<CompletableFuture<Void>> tasks = List.of(
                task(() -> collectKr(collected)),
                task(() -> collectCnbc(collected)),
                task(() -> collectUpbit(collected)),
                task(() -> collectFx(collected)));
        for (CompletableFuture<Void> task : tasks) {
            try {
                task.join();
            } catch (Exception error) {
                log.warn("Quote task failed: {}", error.getMessage());
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (String id : ORDER) {
            Map<String, Object> row = collected.get(id);
            if (row != null) {
                rows.add(row);
            }
        }
        if (rows.isEmpty()) {
            return current != null ? current : new Board(List.of(), Instant.now());
        }
        Board fresh = new Board(rows, Instant.now());
        cache = fresh;
        cachedAt = System.currentTimeMillis();
        return fresh;
    }

    // 콜드 스타트 직후 첫 요청이 느리지 않도록, 서버가 뜨자마자 백그라운드에서 시세를 미리 채워 둡니다.
    @EventListener(ApplicationReadyEvent.class)
    public void warmOnStartup() {
        CompletableFuture.runAsync(this::quotes);
    }

    private CompletableFuture<Void> task(Runnable runnable) {
        return CompletableFuture.runAsync(runnable);
    }

    private void collectKr(Map<String, Map<String, Object>> collected) {
        collectKrFrom(get(NAVER_KR_URL), collected);
    }

    static void collectKrFrom(JsonNode root, Map<String, Map<String, Object>> collected) {
        JsonNode datas = root.path("datas");
        if (!datas.isArray()) {
            return;
        }
        for (JsonNode data : datas) {
            String code = data.path("itemCode").asText("");
            Info info = INFO.get(code);
            if (info == null) {
                continue;
            }
            JsonNode over = data.path("overMarketPriceInfo");
            boolean regularOpen = "OPEN".equals(data.path("marketStatus").asText(""));
            if (!regularOpen && over.isObject() && "OPEN".equals(over.path("overMarketStatus").asText(""))) {
                double overPrice = num(over.path("overPrice").asText(""));
                double overChange = num(over.path("compareToPreviousClosePrice").asText(""));
                double overPercent = num(over.path("fluctuationsRatio").asText(""));
                collected.put(code, row(info, overPrice, overChange, overPercent,
                        sessionOf(over.path("tradingSessionType").asText(""))));
                continue;
            }
            double price = num(data.path("closePrice").asText(""));
            double change = num(data.path("compareToPreviousClosePrice").asText(""));
            double percent = num(data.path("fluctuationsRatio").asText(""));
            String sign = data.path("compareToPreviousPrice").path("code").asText("");
            if ("4".equals(sign) || "5".equals(sign)) {
                change = -Math.abs(change);
                percent = -Math.abs(percent);
            } else if ("3".equals(sign)) {
                change = 0;
                percent = 0;
            }
            collected.put(code, row(info, price, change, percent, "regular"));
        }
    }

    private void collectCnbc(Map<String, Map<String, Object>> collected) {
        JsonNode root = get(CNBC_URL);
        JsonNode quotes = root.path("FormattedQuoteResult").path("FormattedQuote");
        List<JsonNode> nodes = new ArrayList<>();
        if (quotes.isArray()) {
            quotes.forEach(nodes::add);
        } else if (quotes.isObject()) {
            nodes.add(quotes);
        }
        for (JsonNode quote : nodes) {
            String symbol = quote.path("symbol").asText("");
            String id = "@CL.1".equals(symbol) ? "CL.F" : symbol;
            Info info = INFO.get(id);
            if (info == null) {
                continue;
            }
            String market = quote.path("curmktstatus").asText("");
            JsonNode extended = quote.path("ExtendedMktQuote");
            if (("PRE_MKT".equals(market) || "POST_MKT".equals(market))
                    && extended.isObject() && !extended.path("last").asText("").isEmpty()) {
                double extPrice = num(extended.path("last").asText(""));
                double extChange = num(extended.path("change").asText(""));
                double extPercent = num(extended.path("change_pct").asText(""));
                collected.put(id, row(info, extPrice, extChange, extPercent,
                        sessionOf(extended.path("type").asText(market))));
                continue;
            }
            double price = num(quote.path("last").asText(""));
            double change = num(quote.path("change").asText(""));
            double percent = num(quote.path("change_pct").asText(""));
            collected.put(id, row(info, price, change, percent, "regular"));
        }
    }

    private void collectUpbit(Map<String, Map<String, Object>> collected) {
        JsonNode root = get(UPBIT_URL);
        if (!root.isArray()) {
            return;
        }
        for (JsonNode coin : root) {
            String market = coin.path("market").asText("");
            Info info = INFO.get(market.replace("KRW-", ""));
            if (info == null) {
                continue;
            }
            double price = coin.path("trade_price").asDouble();
            double change = coin.path("signed_change_price").asDouble();
            double percent = coin.path("signed_change_rate").asDouble() * 100;
            collected.put(info.code(), row(info, price, change, percent, "regular"));
        }
    }

    private void collectFx(Map<String, Map<String, Object>> collected) {
        for (String fxCode : FX_CODES) {
            JsonNode root = get(NAVER_FX_URL + fxCode);
            JsonNode exchange = root.path("exchangeInfo");
            if (exchange.isMissingNode() || exchange.isEmpty()) {
                continue;
            }
            Info info = INFO.get(fxCode);
            if (info == null) {
                continue;
            }
            double price = num(exchange.path("closePrice").asText(""));
            double change = num(exchange.path("fluctuations").asText(""));
            double percent = num(exchange.path("fluctuationsRatio").asText(""));
            String sign = exchange.path("fluctuationsType").path("code").asText("");
            if ("4".equals(sign) || "5".equals(sign)) {
                change = -Math.abs(change);
                percent = -Math.abs(percent);
            } else if ("3".equals(sign)) {
                change = 0;
                percent = 0;
            }
            collected.put(fxCode, row(info, price, change, percent, "regular"));
        }
    }

    private JsonNode get(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalStateException("HTTP " + response.statusCode());
            }
            return mapper.readTree(response.body());
        } catch (Exception error) {
            log.warn("Could not load quotes from {}: {}", url, error.getMessage());
            return mapper.createObjectNode();
        }
    }

    private static Map<String, Object> row(Info info, double price, double change, double percent, String session) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("symbol", info.code());
        row.put("name", info.name());
        row.put("group", info.group());
        row.put("price", round(price));
        row.put("change", round(change));
        row.put("changePercent", round(percent));
        row.put("currency", info.unit());
        row.put("session", session);
        return row;
    }

    private static String sessionOf(String tradingSessionType) {
        String type = tradingSessionType == null ? "" : tradingSessionType.toUpperCase(Locale.ROOT);
        if (type.startsWith("PRE")) {
            return "pre";
        }
        if (type.startsWith("POST") || type.startsWith("AFTER")) {
            return "post";
        }
        return "regular";
    }

    private static double num(String value) {
        if (value == null) {
            return 0;
        }
        String cleaned = value.replaceAll("[^0-9.+-]", "");
        if (cleaned.isEmpty() || "+".equals(cleaned) || "-".equals(cleaned)) {
            return 0;
        }
        try {
            return Double.parseDouble(cleaned);
        } catch (NumberFormatException error) {
            return 0;
        }
    }

    private static double round(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }
}
