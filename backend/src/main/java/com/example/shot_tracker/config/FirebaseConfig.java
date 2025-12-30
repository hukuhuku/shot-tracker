package com.example.shot_tracker.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            // 1. 環境変数の取得確認
            String serviceAccountJson = System.getenv("FIREBASE_SERVICE_ACCOUNT");

            if (serviceAccountJson == null || serviceAccountJson.isEmpty()) {
                System.err.println("🔥 CRITICAL ERROR: Environment variable 'FIREBASE_SERVICE_ACCOUNT' is NOT SET or EMPTY.");
                return;
            } else {
                System.out.println("✅ FIREBASE_SERVICE_ACCOUNT found. Length: " + serviceAccountJson.length());
            }

            // 2. 二重初期化の防止
            List<FirebaseApp> apps = FirebaseApp.getApps();
            if (!apps.isEmpty()) {
                System.out.println("ℹ️ Firebase App already initialized: " + apps.get(0).getName());
                return;
            }

            // 3. 初期化処理
            try {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(
                                new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8))))
                        .build();

                FirebaseApp.initializeApp(options);
                System.out.println("🚀 Firebase Admin SDK initialized successfully.");
            } catch (Exception e) {
                System.err.println("🔥 Failed to initialize Firebase: " + e.getMessage());
            }

        } catch (Exception e) {
            System.err.println("🔥 Unexpected error in FirebaseConfig: " + e.getMessage());
        }
    }
}