package com.codestudio.board;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/drawings")
public class DrawingController {
    private static final long MAX_STORAGE_BYTES = 5L * 1024 * 1024;
    private static final byte[] PNG_SIGNATURE = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    };

    private final DrawingRepository drawings;

    public DrawingController(DrawingRepository drawings) {
        this.drawings = drawings;
    }

    @GetMapping
    public List<DrawingSummary> getDrawings(Authentication authentication) {
        return drawings.findAllByOwnerIdOrderByIdDesc(ownerId(authentication)).stream()
                .map(DrawingSummary::new)
                .toList();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<DrawingSummary> saveDrawing(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "저장할 그림이 비어 있습니다.");
        }
        if (file.getSize() > MAX_STORAGE_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "그림은 5MB 이하만 저장할 수 있습니다.");
        }

        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "그림 파일을 읽을 수 없습니다.", exception);
        }
        if (!isPng(data)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "PNG 그림 파일만 저장할 수 있습니다.");
        }

        long totalBytes = drawings.sumFileSize();
        for (Drawing oldest : drawings.findAllByOrderByIdAsc()) {
            if (totalBytes + data.length <= MAX_STORAGE_BYTES) {
                break;
            }
            totalBytes -= oldest.getFileSize();
            drawings.delete(oldest);
        }

        Drawing saved = drawings.save(new Drawing(ownerId(authentication), data));
        return ResponseEntity.ok(new DrawingSummary(saved));
    }

    @GetMapping(value = "/{id}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<Resource> getDrawing(@PathVariable Long id, Authentication authentication) {
        Drawing drawing = drawings.findByIdAndOwnerId(id, ownerId(authentication))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"drawing.png\"")
                .body(new ByteArrayResource(drawing.getData()));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteDrawing(@PathVariable Long id, Authentication authentication) {
        Drawing drawing = drawings.findByIdAndOwnerId(id, ownerId(authentication))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        drawings.delete(drawing);
        return ResponseEntity.noContent().build();
    }

    private static Long ownerId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }

    private static boolean isPng(byte[] data) {
        if (data.length < PNG_SIGNATURE.length) {
            return false;
        }
        for (int index = 0; index < PNG_SIGNATURE.length; index++) {
            if (data[index] != PNG_SIGNATURE[index]) {
                return false;
            }
        }
        return true;
    }
}
