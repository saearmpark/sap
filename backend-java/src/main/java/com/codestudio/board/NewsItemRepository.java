package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface NewsItemRepository extends JpaRepository<NewsItem, Long> {

    boolean existsByLinkHash(String linkHash);

    List<NewsItem> findTop150ByOrderByIdDesc();

    @Modifying
    @Query("delete from NewsItem n where n.fetchedAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
