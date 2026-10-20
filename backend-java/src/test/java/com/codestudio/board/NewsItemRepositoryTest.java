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
        assertEquals("소식 24", newest.get(0).getTitle());
        assertEquals("소식 5", newest.get(newest.size() - 1).getTitle());
        assertEquals(25, news.count());
    }

    @Test
    void filtersByCategoryAndTrimsEachCategorySeparately() {
        Instant now = Instant.now();
        for (int i = 0; i < 25; i++) {
            news.save(new NewsItem("국내 " + i, "https://example.com/domestic/" + i, "dom-" + i, "테스트", "국내", "요약",
                    "", now, now));
        }
        for (int i = 0; i < 3; i++) {
            news.save(new NewsItem("경제 " + i, "https://example.com/economy/" + i, "eco-" + i, "테스트", "경제", "요약",
                    "", now, now));
        }

        assertEquals(3, news.findTop20ByCategoryOrderByIdDesc("경제").size());
        List<NewsItem> domestic = news.findTop20ByCategoryOrderByIdDesc("국내");
        assertEquals(20, domestic.size());
        long cutoff = domestic.get(domestic.size() - 1).getId();
        assertEquals(5, news.deleteByCategoryAndIdLessThan("국내", cutoff));
        assertEquals(20, news.findTop20ByCategoryOrderByIdDesc("국내").size());
        assertEquals(3, news.findTop20ByCategoryOrderByIdDesc("경제").size());
    }
}
