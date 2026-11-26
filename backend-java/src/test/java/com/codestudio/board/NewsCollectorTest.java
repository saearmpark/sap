package com.codestudio.board;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NewsCollectorTest {

    @Test
    void stripsSourceSuffixAndNormalizesCaseAndPunctuation() {
        assertEquals("삼성전자실적발표", NewsCollector.normalizeTitle("삼성전자 실적 발표 - 연합뉴스"));
        assertEquals("fedholdsrates", NewsCollector.normalizeTitle("Fed Holds Rates"));
        assertEquals("美금리동결", NewsCollector.normalizeTitle("美 금리, 동결!"));
        assertEquals("", NewsCollector.normalizeTitle(null));
        assertEquals("", NewsCollector.normalizeTitle("   "));
    }

    @Test
    void treatsSameHeadlineFromDifferentSourcesAsDuplicate() {
        assertEquals(
                NewsCollector.normalizeTitle("코스피 3,000선 돌파 - 연합뉴스"),
                NewsCollector.normalizeTitle("코스피 3,000선 돌파 - 매일경제"));
    }

    @Test
    void acceptsOnlyEconomicNewsFromTheLastSevenDays() {
        Instant now = Instant.parse("2026-11-14T00:00:00Z");

        assertTrue(NewsCollector.isFreshEconomicArticle(now.minusSeconds(7 * 24 * 60 * 60L), now));
        assertTrue(NewsCollector.isFreshEconomicArticle(now.minusSeconds(60), now));
        assertFalse(NewsCollector.isFreshEconomicArticle(now.minusSeconds(8 * 24 * 60 * 60L), now));
        assertFalse(NewsCollector.isFreshEconomicArticle(null, now));
    }

    @Test
    void treatsNewsAsStaleAfterTheMaxAge() {
        Instant now = Instant.parse("2026-11-26T00:00:00Z");
        Duration oneHour = Duration.ofHours(1);

        assertTrue(NewsCollector.isStale(null, oneHour, now));
        assertTrue(NewsCollector.isStale(now.minusSeconds(2 * 60 * 60), oneHour, now));
        assertFalse(NewsCollector.isStale(now.minusSeconds(30 * 60), oneHour, now));
        assertFalse(NewsCollector.isStale(now.minusSeconds(60 * 60 - 1), oneHour, now));
    }

    @Test
    void refreshSummaryIsHealthyWhenAtLeastOneFeedSucceeded() {
        assertTrue(new NewsCollector.RefreshSummary(0, 0, 0, 1, 8).healthy());
        assertFalse(new NewsCollector.RefreshSummary(0, 0, 0, 0, 9).healthy());
    }
}
