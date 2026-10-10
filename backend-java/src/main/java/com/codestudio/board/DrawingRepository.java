package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DrawingRepository extends JpaRepository<Drawing, Long> {
    List<Drawing> findAllByOrderByIdAsc();

    List<Drawing> findAllByOwnerIdOrderByIdDesc(Long ownerId);

    Optional<Drawing> findByIdAndOwnerId(Long id, Long ownerId);

    @Query("select coalesce(sum(d.fileSize), 0) from Drawing d")
    long sumFileSize();
}
