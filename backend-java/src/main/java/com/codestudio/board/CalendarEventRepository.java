package com.codestudio.board;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {
    List<CalendarEvent> findAllByOwnerIdOrderByStartDateAscIdAsc(Long ownerId);
    List<CalendarEvent> findAllByOwnerIdOrPublicEventTrueOrderByStartDateAscIdAsc(Long ownerId);
    Optional<CalendarEvent> findByIdAndOwnerId(Long id, Long ownerId);
}
