package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findAllByOrderByIdDesc();
    List<Post> findAllByAuthorName(String authorName);
    void deleteAllByAuthorName(String authorName);
}
