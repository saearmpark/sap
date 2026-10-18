package com.codestudio.board;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/stocks")
public class StockQuoteController {

    private final StockQuoteService service;

    public StockQuoteController(StockQuoteService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> list() {
        StockQuoteService.Board board = service.quotes();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("updatedAt", board.updatedAt().toString());
        body.put("quotes", board.quotes());
        return body;
    }
}
