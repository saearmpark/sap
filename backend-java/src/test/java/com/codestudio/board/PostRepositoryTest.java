package com.codestudio.board;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest(properties = "spring.datasource.url=jdbc:h2:mem:post-repository-test;DB_CLOSE_DELAY=-1")
@SuppressWarnings("null")
class PostRepositoryTest {

    @Autowired
    private PostRepository repository;

    @Test
    void findAllByOrderByIdDescReturnsNewestPostFirst() {
        repository.save(new Post("First", "First body", "2026-09-29 12:00"));
        repository.save(new Post("Second", "Second body", "2026-09-29 12:01"));

        List<Post> posts = repository.findAllByOrderByIdDesc();

        assertThat(posts).extracting(Post::getTitle).containsExactly("Second", "First");
    }
}