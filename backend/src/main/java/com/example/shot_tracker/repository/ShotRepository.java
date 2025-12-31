package com.example.shot_tracker.repository;

import com.example.shot_tracker.model.ShotRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShotRepository extends JpaRepository<ShotRecord, Long> {
//
    //1. 特定ユーザーの記録を全取得する
    List<ShotRecord> findByUserId(String UserID);

    // 2. 特定期間のユーザー記録を取得する。
    List<ShotRecord> findByUserIdAndDateBetween(String userId, LocalDate startDate, LocalDate endDate);

    // 3. 特定ユーザーの特定日のユーザー記録を取得する
    List<ShotRecord> findByUserIdAndDate(String currentUserId, LocalDate date);

    // 4. Insert or Add の判定に利用
    Optional<ShotRecord> findByUserIdAndDateAndZoneId(String userId, LocalDate date, String zoneId);
}
