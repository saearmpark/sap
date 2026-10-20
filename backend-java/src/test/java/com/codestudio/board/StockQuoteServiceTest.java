package com.codestudio.board;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StockQuoteServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void usesPreMarketPriceWhileRegularMarketIsClosed() throws Exception {
        Map<String, Map<String, Object>> collected = new LinkedHashMap<>();

        StockQuoteService.collectKrFrom(mapper.readTree("""
                {"datas":[{
                  "itemCode":"005930",
                  "closePrice":"215,500",
                  "compareToPreviousClosePrice":"0",
                  "fluctuationsRatio":"0.00",
                  "compareToPreviousPrice":{"code":"3"},
                  "marketStatus":"PREOPEN",
                  "overMarketPriceInfo":{
                    "tradingSessionType":"PRE_MARKET",
                    "overMarketStatus":"OPEN",
                    "overPrice":"205,000",
                    "compareToPreviousClosePrice":"-10,500",
                    "fluctuationsRatio":"-4.87"
                  }
                }]}
                """), collected);

        Map<String, Object> row = collected.get("005930");
        assertNotNull(row);
        assertEquals(205000.0, row.get("price"));
        assertEquals(-10500.0, row.get("change"));
        assertEquals(-4.87, row.get("changePercent"));
        assertEquals("pre", row.get("session"));
        assertEquals("open", row.get("marketState"));
    }

    @Test
    void usesRegularPriceWhileMarketIsOpen() throws Exception {
        Map<String, Map<String, Object>> collected = new LinkedHashMap<>();

        StockQuoteService.collectKrFrom(mapper.readTree("""
                {"datas":[{
                  "itemCode":"005930",
                  "closePrice":"209,500",
                  "compareToPreviousClosePrice":"6,000",
                  "fluctuationsRatio":"2.95",
                  "compareToPreviousPrice":{"code":"5"},
                  "marketStatus":"OPEN",
                  "overMarketPriceInfo":{
                    "tradingSessionType":"PRE_MARKET",
                    "overMarketStatus":"CLOSE",
                    "overPrice":"205,000",
                    "compareToPreviousClosePrice":"-10,500",
                    "fluctuationsRatio":"-4.87"
                  }
                }]}
                """), collected);

        Map<String, Object> row = collected.get("005930");
        assertNotNull(row);
        assertEquals(209500.0, row.get("price"));
        assertEquals(-6000.0, row.get("change"));
        assertEquals(-2.95, row.get("changePercent"));
        assertEquals("regular", row.get("session"));
        assertEquals("open", row.get("marketState"));
    }

    @Test
    void marksRegularSessionAsClosedWhenMarketIsClosed() throws Exception {
        Map<String, Map<String, Object>> collected = new LinkedHashMap<>();

        StockQuoteService.collectKrFrom(mapper.readTree("""
                {"datas":[{
                  "itemCode":"005930",
                  "closePrice":"201,000",
                  "compareToPreviousClosePrice":"1,000",
                  "fluctuationsRatio":"0.50",
                  "compareToPreviousPrice":{"code":"2"},
                  "marketStatus":"CLOSE",
                  "overMarketPriceInfo":{"overMarketStatus":"CLOSE"}
                }]}
                """), collected);

        Map<String, Object> row = collected.get("005930");
        assertNotNull(row);
        assertEquals(201000.0, row.get("price"));
        assertEquals("regular", row.get("session"));
        assertEquals("closed", row.get("marketState"));
    }

    @Test
    void marksResultPartialWhenAQuoteTaskFails() {
        AtomicBoolean partial = new AtomicBoolean(false);
        StockQuoteService.task(() -> {
            throw new IllegalStateException("boom");
        }, partial).join();
        assertTrue(partial.get());
    }

    @Test
    void keepsResultCompleteWhenQuoteTasksSucceed() {
        AtomicBoolean partial = new AtomicBoolean(false);
        StockQuoteService.task(() -> {
        }, partial).join();
        assertFalse(partial.get());
    }
}
