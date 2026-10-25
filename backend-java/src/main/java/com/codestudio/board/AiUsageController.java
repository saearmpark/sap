package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-usage")
public class AiUsageController {
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private volatile UsageSnapshot cached;

    public AiUsageController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public synchronized Map<String, Object> usage() {
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.response();
        }
        Map<String, Object> response = new HashMap<>();
        String key = System.getenv("OPENAI_ADMIN_KEY");
        Double budget = parseDouble(System.getenv("OPENAI_MONTHLY_BUDGET_USD"));
        if (key == null || key.isBlank() || budget == null || budget <= 0) {
            response.put("remainingPercent", null);
            response.put("updatedAt", Instant.now().toString());
            cached = new UsageSnapshot(response, Instant.now().plusSeconds(300));
            return response;
        }
        try {
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            OffsetDateTime first = now.with(TemporalAdjusters.firstDayOfMonth()).withHour(0).withMinute(0).withSecond(0).withNano(0);
            String url = "https://api.openai.com/v1/organization/costs?start_time="
                + first.toEpochSecond() + "&end_time=" + now.toEpochSecond() + "&bucket_width=1d";
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("Authorization", "Bearer " + key.trim())
                .header("Accept", "application/json")
                .GET().build();
            HttpResponse<String> result = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (result.statusCode() / 100 != 2) throw new IllegalStateException("OpenAI costs API returned " + result.statusCode());
            double spent = sumCostValues(objectMapper.readTree(result.body()));
            int percent = (int) Math.round(Math.max(0, Math.min(100, (1 - spent / budget) * 100)));
            response.put("remainingPercent", percent);
            response.put("spentUsd", Math.round(spent * 100.0) / 100.0);
            response.put("budgetUsd", budget);
            response.put("updatedAt", Instant.now().toString());
        } catch (Exception ignored) {
            response.put("remainingPercent", null);
            response.put("updatedAt", Instant.now().toString());
        }
        cached = new UsageSnapshot(response, Instant.now().plusSeconds(300));
        return response;
    }

    private static Double parseDouble(String value) {
        try { return value == null ? null : Double.parseDouble(value.trim()); }
        catch (NumberFormatException ignored) { return null; }
    }

    private static double sumCostValues(JsonNode root) {
        double total = 0;
        JsonNode data = root.path("data");
        if (!data.isArray()) return total;
        for (JsonNode bucket : data) {
            JsonNode results = bucket.path("results");
            if (!results.isArray()) continue;
            for (JsonNode item : results) total += item.path("amount").path("value").asDouble(0);
        }
        return total;
    }

    private record UsageSnapshot(Map<String, Object> response, Instant expiresAt) {}
}
