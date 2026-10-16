package com.codestudio.board;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
    private static final Set<String> REPEAT_RULES = Set.of("none", "daily", "weekly", "monthly");
    private static final DateTimeFormatter ICS_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

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
        Set<Long> ownerIds = visibleEvents.stream()
                .map(event -> Objects.requireNonNull(event.getOwnerId())).collect(Collectors.toSet());
        Map<Long, String> displayNames = new HashMap<>();
        for (Long ownerId : ownerIds) {
            users.findById(Objects.requireNonNull(ownerId)).ifPresent(user ->
                    displayNames.put(Objects.requireNonNull(user.getId()), Objects.requireNonNull(user.getDisplayName())));
        }
        return visibleEvents.stream().map(event -> new EventView(
                event.getId(), event.getTitle(), event.getDescription(), event.getStartDate(), event.getEndDate(),
                event.getPublicEvent(), event.getOwnerId().equals(viewerId), displayNames.getOrDefault(event.getOwnerId(), "사용자"),
                event.getRepeatRule()
        )).toList();
    }

    @PostMapping
    public ResponseEntity<CalendarEvent> create(Authentication authentication, @RequestBody EventRequest request) {
        CalendarEvent event = toEvent(userId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(events.save(Objects.requireNonNull(event)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(Authentication authentication, @PathVariable Long id, @RequestBody EventRequest request) {
        Long ownerId = userId(authentication);
        CalendarEvent event = events.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."));
        CalendarEvent updated = toEvent(ownerId, request);
        event.update(updated.getTitle(), updated.getDescription(), updated.getStartDate(), updated.getEndDate(), updated.getPublicEvent(), updated.getRepeatRule());
        return ResponseEntity.ok(events.save(Objects.requireNonNull(event)));
    }

    @GetMapping("/export")
    public ResponseEntity<String> export(Authentication authentication) {
        List<CalendarEvent> mine = events.findAllByOwnerIdOrderByStartDateAscIdAsc(userId(authentication));
        StringBuilder ics = new StringBuilder()
                .append("BEGIN:VCALENDAR\r\n")
                .append("VERSION:2.0\r\n")
                .append("PRODID:-//codestudio//sap calendar//KO\r\n")
                .append("CALSCALE:GREGORIAN\r\n");
        for (CalendarEvent event : mine) {
            ics.append("BEGIN:VEVENT\r\n")
                    .append("UID:sap-event-").append(event.getId()).append("@codestudio\r\n")
                    .append("DTSTAMP:").append(LocalDate.now().format(ICS_DATE)).append("T000000Z\r\n")
                    .append("DTSTART;VALUE=DATE:").append(event.getStartDate().format(ICS_DATE)).append("\r\n")
                    .append("DTEND;VALUE=DATE:").append(event.getEndDate().plusDays(1).format(ICS_DATE)).append("\r\n")
                    .append("SUMMARY:").append(escapeIcs(event.getTitle())).append("\r\n");
            if (event.getDescription() != null && !event.getDescription().isBlank()) {
                ics.append("DESCRIPTION:").append(escapeIcs(event.getDescription())).append("\r\n");
            }
            String rule = event.getRepeatRule();
            if (!"none".equals(rule)) {
                ics.append("RRULE:FREQ=").append(rule.toUpperCase()).append("\r\n");
            }
            ics.append("END:VEVENT\r\n");
        }
        ics.append("END:VCALENDAR\r\n");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/calendar; charset=utf-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sap-events.ics\"")
                .body(ics.toString());
    }

    private static String escapeIcs(String value) {
        return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
                .replace("\r\n", "\\n").replace("\n", "\\n");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(Authentication authentication, @PathVariable Long id) {
        CalendarEvent event = events.findByIdAndOwnerId(id, userId(authentication))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."));
        events.delete(Objects.requireNonNull(event));
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
        String repeatRule = request.repeatRule() == null ? "none" : request.repeatRule().trim();
        if (!REPEAT_RULES.contains(repeatRule)) repeatRule = "none";
        return new CalendarEvent(ownerId, title, description, request.startDate(), request.endDate(), request.publicEvent(), repeatRule);
    }

    private Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }

    public record EventRequest(String title, String description, LocalDate startDate, LocalDate endDate, boolean publicEvent, String repeatRule) {}
    @com.fasterxml.jackson.databind.annotation.JsonNaming(com.fasterxml.jackson.databind.PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record EventView(Long id, String title, String description, LocalDate startDate, LocalDate endDate,
            boolean publicEvent, boolean mine, String ownerDisplayName, String repeatRule) {}
}
