package com.codestudio.board;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsItemRepository repository;

    public NewsController(NewsItemRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return repository.findTop150ByOrderByIdDesc().stream()
                .map(item -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", item.getId());
                    row.put("title", item.getTitle());
                    row.put("link", item.getLink());
                    row.put("source", item.getSource());
                    row.put("category", item.getCategory());
                    row.put("summary", item.getSummary());
                    row.put("publishedAt", item.getPublishedAt() == null ? null : item.getPublishedAt().toString());
                    row.put("fetchedAt", item.getFetchedAt().toString());
                    return row;
                })
                .toList();
    }
}
