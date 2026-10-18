package com.codestudio.board;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.Instant;
import java.util.List;

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
    void dedupesByLinkHashAndKeepsNewestTwenty() {
        Instant now = Instant.now();
        for (int i = 0; i < 25; i++) {
            news.save(new NewsItem("소식 " + i, "https://example.com/" + i, "hash-" + i, "테스트", "국내", "요약",
                    "", now, now));
        }

        assertTrue(news.existsByLinkHash("hash-0"));
        assertFalse(news.existsByLinkHash("hash-x"));

        List<NewsItem> newest = news.findTop20ByOrderByIdDesc();
        assertEquals(20, newest.size());
        long cutoff = newest.get(newest.size() - 1).getId();
        assertEquals(5, news.deleteByIdLessThan(cutoff));
        assertEquals(20, news.count());
    }
}
