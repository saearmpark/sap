package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findTop100ByChatTypeAndCreatedAtAfterOrderByCreatedAtDesc(String chatType, Instant after);

    @Query("""
            select m from ChatMessage m
            where m.chatType = 'DIRECT' and m.createdAt > :after
              and ((m.senderId = :userId and m.recipientId = :otherId)
                or (m.senderId = :otherId and m.recipientId = :userId))
            order by m.createdAt asc
            """)
    List<ChatMessage> findDirectConversation(
            @Param("userId") Long userId,
            @Param("otherId") Long otherId,
            @Param("after") Instant after);

    @Modifying
    @Query("delete from ChatMessage m where m.createdAt < :cutoff")
    int deleteExpired(@Param("cutoff") Instant cutoff);
}
