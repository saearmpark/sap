package com.codestudio.board;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:news-item-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class NewsItemRepositoryTest {

    @Autowired
    private NewsItemRepository news;

    @Test
    void dedupesByLinkHashAndExpiresOldItems() {
        Instant now = Instant.now();
        news.save(new NewsItem("첫 소식", "https://example.com/a", "hash-a", "테스트", "국내", "요약", now, now));
        news.save(new NewsItem("오래된 소식", "https://example.com/b", "hash-b", "테스트", "해외", "요약", now,
                now.minus(48, ChronoUnit.HOURS)));

        assertTrue(news.existsByLinkHash("hash-a"));
        assertFalse(news.existsByLinkHash("hash-c"));

        int removed = news.deleteOlderThan(now.minus(24, ChronoUnit.HOURS));
        assertEquals(1, removed);
        assertTrue(news.existsByLinkHash("hash-a"));
        assertFalse(news.existsByLinkHash("hash-b"));
    }
}
