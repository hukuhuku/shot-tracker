package com.example.shot_tracker.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

// @Entity: これがデータベースのテーブルになることを示します
// @Data: Lombokの機能で、Getter/Setterなどを自動生成します
@Entity
@Data
@Table(name = "shot_records") // テーブル名を指定
public class ShotRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // IDは自動採番
    private Long id;

    // ユーザーID（今回は簡易的に固定値やパラメータで扱いますが、将来的に認証と紐付けます）
    private String userId;

    // 練習日
    @Column(nullable = false)
    private LocalDate date;

    // ゾーンID (例: "Mid-Top", "Paint")
    @Column(nullable = false)
    private String zoneId;

    // カテゴリー (例: "Mid", "3PT")
    @Column(nullable = false)
    private String category;

    // 成功数
    private int makes;

    // 試投数
    private int attempts;
}