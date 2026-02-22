package com.example.shot_tracker.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            // Railwayの環境変数 "FIREBASE_SERVICE_ACCOUNT" からJSON文字列を取得
            String serviceAccountJson = System.getenv("FIREBASE_SERVICE_ACCOUNT");

            if (serviceAccountJson != null && !serviceAccountJson.isEmpty() && FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(
                                new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8))))
                        .build();

                FirebaseApp.initializeApp(options);
                System.out.println("Firebase Admin SDK initialized successfully.");
            } else {
                System.out.println("Firebase Service Account not found or App already initialized.");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}