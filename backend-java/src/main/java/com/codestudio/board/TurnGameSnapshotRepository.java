package com.codestudio.board;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TurnGameSnapshotRepository extends JpaRepository<TurnGameSnapshot, String> {
}
