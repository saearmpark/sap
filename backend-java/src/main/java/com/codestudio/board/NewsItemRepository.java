package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NewsItemRepository extends JpaRepository<NewsItem, Long> {

    boolean existsByLinkHash(String linkHash);

    List<NewsItem> findTop20ByOrderByIdDesc();

    @Modifying
    @Query("delete from NewsItem n where n.id < :cutoff")
    int deleteByIdLessThan(@Param("cutoff") long cutoff);
}
