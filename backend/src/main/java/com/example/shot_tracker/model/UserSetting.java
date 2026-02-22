package com.example.shot_tracker.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "user_settings")
public class UserSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String userId;

    private Integer goalPct; // null = 未設定、0〜100（5刻み）
}
