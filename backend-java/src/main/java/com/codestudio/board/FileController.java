package com.codestudio.board;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final FileItemRepository repository;

    public FileController(FileItemRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<FileItem> list() {
        return repository.findAllByOrderByIdDesc();
    }

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "업로드할 파일을 선택하세요."));
        }

        FileItem item = new FileItem();
        item.setOriginalName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        item.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        item.setSizeBytes(file.getSize());
        item.setUploadedAt(ZonedDateTime.now(KST).format(FORMATTER));
        item.setData(file.getBytes());

        FileItem saved = repository.save(item);
        return ResponseEntity.status(201).body(Map.of("id", saved.getId(), "message", "업로드되었습니다."));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<ByteArrayResource> download(@PathVariable Long id) {
        FileItem item = repository.findById(id).orElse(null);
        if (item == null) {
            return ResponseEntity.notFound().build();
        }

        ByteArrayResource resource = new ByteArrayResource(item.getData());
        String encodedName = URLEncoder.encode(item.getOriginalName(), StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(item.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedName)
                .contentLength(item.getData().length)
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "삭제되었습니다."));
    }
}
