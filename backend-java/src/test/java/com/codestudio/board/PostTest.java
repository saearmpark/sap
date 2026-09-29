package com.codestudio.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class PostTest {

    @Test
    void defaultConstructorLeavesFieldsUnset() {
        Post post = new Post();

        assertNull(post.getId());
        assertNull(post.getTitle());
        assertNull(post.getContent());
        assertNull(post.getCreatedAt());
    }

    @Test
    void constructorAndSettersExposePostValues() {
        Post post = new Post("Initial title", "Initial content", "2026-09-29 12:00");
        post.setTitle("Updated title");
        post.setContent("Updated content");
        post.setCreatedAt("2026-09-29 12:30");

        assertEquals("Updated title", post.getTitle());
        assertEquals("Updated content", post.getContent());
        assertEquals("2026-09-29 12:30", post.getCreatedAt());
    }
}