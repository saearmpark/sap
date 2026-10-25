package com.codestudio.board;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
    List<PostComment> findAllByPostIdOrderByIdAsc(Long postId);

    void deleteAllByPostId(Long postId);

    void deleteAllByAuthorName(String authorName);
}
