package com.codestudio.board;

import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SuppressWarnings("null")
@WebMvcTest(PostController.class)
@Import(CorsConfig.class)
class PostControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PostRepository repository;

    @Test
    void listReturnsPostsInRepositoryOrder() throws Exception {
        given(repository.findAllByOrderByIdDesc())
                .willReturn(List.of(new Post("Latest", "Content", "2026-09-29 12:00")));

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Latest"));
    }

    @Test
    void getReturnsPostWhenItExists() throws Exception {
        given(repository.findById(7L))
                .willReturn(Optional.of(new Post("Found", "Content", "2026-09-29 12:00")));

        mockMvc.perform(get("/api/posts/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Found"));
    }

    @Test
    void getReturnsNotFoundWhenPostIsMissing() throws Exception {
        given(repository.findById(99L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/posts/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void createRejectsBlankTitleOrContentWithoutSaving() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"  \",\"content\":\"Body\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(repository);
    }

    @Test
    void createTrimsValuesAndReturnsCreatedId() throws Exception {
        given(repository.save(any(Post.class))).willAnswer(invocation -> {
            Post saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 42L);
            return saved;
        });

        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"  Title  \",\"content\":\"  Body  \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42));

        verify(repository).save(any(Post.class));
    }

    @Test
    void deleteRemovesPostById() throws Exception {
        mockMvc.perform(delete("/api/posts/12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(repository).deleteById(12L);
    }

    @Test
    void corsAllowsConfiguredApiPreflightMethods() throws Exception {
        mockMvc.perform(options("/api/posts")
                        .header(HttpHeaders.ORIGIN, "https://client.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PUT"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, containsString("PUT")));
    }
}