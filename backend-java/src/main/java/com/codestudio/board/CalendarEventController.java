package com.codestudio.board;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/events")
public class CalendarEventController {
    private final CalendarEventRepository events;
    private final UserAccountRepository users;

    public CalendarEventController(CalendarEventRepository events, UserAccountRepository users) {
        this.events = events;
        this.users = users;
    }

    @GetMapping
    public List<EventView> list(Authentication authentication) {
        Long viewerId = userId(authentication);
        List<CalendarEvent> visibleEvents = events.findAllByOwnerIdOrPublicEventTrueOrderByStartDateAscIdAsc(viewerId);
        Set<Long> ownerIds = visibleEvents.stream().map(CalendarEvent::getOwnerId).collect(Collectors.toSet());
        Map<Long, String> displayNames = users.findAllById(ownerIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getDisplayName));
        return visibleEvents.stream().map(event -> new EventView(
                event.getId(), event.getTitle(), event.getDescription(), event.getStartDate(), event.getEndDate(),
                event.getPublicEvent(), event.getOwnerId().equals(viewerId), displayNames.getOrDefault(event.getOwnerId(), "사용자")
        )).toList();
    }

    @PostMapping
    public ResponseEntity<CalendarEvent> create(Authentication authentication, @RequestBody EventRequest request) {
        CalendarEvent event = toEvent(userId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(events.save(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(Authentication authentication, @PathVariable Long id, @RequestBody EventRequest request) {
        Long ownerId = userId(authentication);
        CalendarEvent event = events.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."));
        CalendarEvent updated = toEvent(ownerId, request);
        event.update(updated.getTitle(), updated.getDescription(), updated.getStartDate(), updated.getEndDate(), updated.getPublicEvent());
        return ResponseEntity.ok(events.save(event));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(Authentication authentication, @PathVariable Long id) {
        CalendarEvent event = events.findByIdAndOwnerId(id, userId(authentication))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."));
        events.delete(event);
        return ResponseEntity.ok(Map.of("message", "일정을 삭제했습니다."));
    }

    private CalendarEvent toEvent(Long ownerId, EventRequest request) {
        String title = request.title() == null ? "" : request.title().trim();
        String description = request.description() == null ? "" : request.description().trim();
        if (title.isBlank() || title.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "일정 제목은 1~120자로 입력하세요.");
        }
        if (description.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상세 내용은 2,000자 이내로 입력하세요.");
        }
        if (request.startDate() == null || request.endDate() == null || request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종료일은 시작일과 같거나 그 이후여야 합니다.");
        }
        return new CalendarEvent(ownerId, title, description, request.startDate(), request.endDate(), request.publicEvent());
    }

    private Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }

    public record EventRequest(String title, String description, LocalDate startDate, LocalDate endDate, boolean publicEvent) {}
    @com.fasterxml.jackson.databind.annotation.JsonNaming(com.fasterxml.jackson.databind.PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record EventView(Long id, String title, String description, LocalDate startDate, LocalDate endDate,
            boolean publicEvent, boolean mine, String ownerDisplayName) {}
}
