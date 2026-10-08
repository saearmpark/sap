package com.codestudio.board;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@SuppressWarnings("null")
@RestController
@RequestMapping("/api/files")
public class FileController {

    private static final DateTimeFormatter UPLOADED_AT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final Path fileStorageLocation = Paths.get("uploads").toAbsolutePath().normalize();
    private final List<FileItem> fileList = new ArrayList<>();
    private long idSequence = 1;

    public FileController() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("업로드 디렉토리를 생성할 수 없습니다.", ex);
        }
    }

    @GetMapping
    public List<FileItem> getAllFiles() {
        return fileList;
    }

    @PostMapping({"", "/upload"})
    public ResponseEntity<FileItem> uploadFile(@RequestParam("file") MultipartFile file) {
        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";
        
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        
        String storedFileName = UUID.randomUUID().toString() + fileExtension;

        try {
            Path targetLocation = this.fileStorageLocation.resolve(storedFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            FileItem fileItem = new FileItem(
                    idSequence++,
                    originalFileName,
                    storedFileName,
                    file.getSize(),
                    file.getContentType(),
                    ZonedDateTime.now(KST).format(UPLOADED_AT_FORMAT)
            );

            fileList.add(fileItem);
            return ResponseEntity.ok(fileItem);
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping({"/download/{id}", "/{id}/download"})
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        FileItem fileItem = fileList.stream()
                .filter(f -> f.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (fileItem == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = this.fileStorageLocation.resolve(fileItem.getStoredFileName()).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                String contentType = fileItem.getFileType();
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileItem.getOriginalFileName() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long id) {
        FileItem fileItem = fileList.stream()
                .filter(f -> f.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (fileItem == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = this.fileStorageLocation.resolve(fileItem.getStoredFileName()).normalize();
            Files.deleteIfExists(filePath);
            fileList.remove(fileItem);
            return ResponseEntity.ok().build();
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
