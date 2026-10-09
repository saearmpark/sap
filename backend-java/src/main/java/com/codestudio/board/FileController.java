package com.codestudio.board;

import org.springframework.core.io.Resource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

@SuppressWarnings("null")
@RestController
@RequestMapping("/api/files")
public class FileController {

    private static final DateTimeFormatter UPLOADED_AT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final UserAccountRepository users;
    private final FileItemRepository files;

    public FileController(UserAccountRepository users, FileItemRepository files) {
        this.users = users;
        this.files = files;
    }

    @GetMapping
    public List<FileItemSummary> getAllFiles() {
        return files.findAllByOrderByIdDesc();
    }

    @PostMapping({"", "/upload"})
    public ResponseEntity<FileItem> uploadFile(@RequestParam("file") MultipartFile file, Authentication authentication) {
        String authorName = users.findById((Long) authentication.getPrincipal())
                .map(UserAccount::getUsername)
                .orElseThrow(() -> new IllegalStateException("로그인 사용자 정보를 찾을 수 없습니다."));
        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";
        
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        
        String storedFileName = UUID.randomUUID().toString() + fileExtension;

        try {
            FileItem fileItem = new FileItem(
                    originalFileName,
                    storedFileName,
                    file.getSize(),
                    file.getContentType(),
                    ZonedDateTime.now(KST).format(UPLOADED_AT_FORMAT),
                    authorName,
                    file.getBytes()
            );
            return ResponseEntity.ok(files.save(fileItem));
        } catch (java.io.IOException ex) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping({"/download/{id}", "/{id}/download"})
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        return serveFile(id, false);
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> previewFile(@PathVariable Long id) {
        return serveFile(id, true);
    }

    private ResponseEntity<Resource> serveFile(Long id, boolean inline) {
        Optional<FileItem> found = files.findById(id);
        if (found.isEmpty() || found.get().getData() == null) return ResponseEntity.notFound().build();
        FileItem fileItem = found.get();
        String contentType = fileItem.getFileType();
        if (contentType == null) contentType = "application/octet-stream";
        if (inline && (!contentType.toLowerCase().startsWith("image/")
                || contentType.equalsIgnoreCase("image/svg+xml"))) {
            return ResponseEntity.status(415).build();
        }

        String disposition = inline ? "inline" : "attachment";
        Resource resource = new ByteArrayResource(fileItem.getData());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + fileItem.getOriginalFileName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long id, Authentication authentication) {
        Optional<FileItem> found = files.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        FileItem file = found.get();
        Long userId = (Long) authentication.getPrincipal();
        boolean administrator = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        String username = users.findById(userId).map(UserAccount::getUsername).orElse("");
        if (!administrator && !username.equals(file.getAuthorName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        files.delete(file);
        return ResponseEntity.ok().build();
    }
}
