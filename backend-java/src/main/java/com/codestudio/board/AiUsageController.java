package com.codestudio.board;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-usage")
public class AiUsageController {
    @GetMapping
    public Map<String, Object> usage() {
        String raw = System.getenv("CODEX_USAGE_REMAINING_PERCENT");
        Integer percent = null;
        if (raw != null) {
            try {
                percent = Math.max(0, Math.min(100, Integer.parseInt(raw.trim())));
            } catch (NumberFormatException ignored) {
                // 잘못된 환경변수는 미연결 상태로 표시합니다.
            }
        }
        Map<String, Object> response = new HashMap<>();
        response.put("remainingPercent", percent);
        response.put("updatedAt", Instant.now().toString());
        return response;
    }
}
