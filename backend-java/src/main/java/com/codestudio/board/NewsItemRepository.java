package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NewsItemRepository extends JpaRepository<NewsItem, Long> {

    boolean existsByLinkHash(String linkHash);

    List<NewsItem> findTop20ByOrderByIdDesc();

    List<NewsItem> findTop20ByCategoryOrderByIdDesc(String category);

    @Modifying
    @Query("delete from NewsItem n where n.category = :category and n.id < :cutoff")
    int deleteByCategoryAndIdLessThan(@Param("category") String category, @Param("cutoff") long cutoff);
}
