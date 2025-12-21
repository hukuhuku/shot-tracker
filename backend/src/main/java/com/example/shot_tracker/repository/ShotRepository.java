package com.example.shot_tracker.repository;

import com.example.shot_tracker.model.ShotRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShotRepository extends JpaRepository<ShotRecord, Long> {

    //特定ユーザーの記録を全取得する
    List<ShotRecord> findByUserId(String UserID);

    //日付順に並べて取得する
    List<ShotRecord> findByUserIdOrderByDateDesc(String UserID);

    List<ShotRecord> findByUserIdAndDate(String currentUserId, LocalDate date);

    Optional<ShotRecord> findByUserIdAndDateAndZoneId(String userId, LocalDate date, String zoneId);
}
