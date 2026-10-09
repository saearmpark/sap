package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileItemRepository extends JpaRepository<FileItem, Long> {
    List<FileItemSummary> findAllByOrderByIdDesc();
}
