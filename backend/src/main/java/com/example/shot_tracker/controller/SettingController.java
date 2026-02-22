package com.example.shot_tracker.controller;

import com.example.shot_tracker.model.UserSetting;
import com.example.shot_tracker.repository.UserSettingRepository;
import com.example.shot_tracker.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = {"https://shot-tracker-theta.vercel.app/", "http://localhost:5173"})
public class SettingController {

    @Autowired
    private UserSettingRepository userSettingRepository;

    @Autowired
    private AuthService authService;

    @GetMapping
    public Map<String, Object> getSetting(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String currentUserId = authService.verifyTokenAndGetUserId(authHeader);
            Optional<UserSetting> setting = userSettingRepository.findByUserId(currentUserId);
            Integer goalPct = setting.map(UserSetting::getGoalPct).orElse(null);

            Map<String, Object> result = new HashMap<>();
            result.put("goalPct", goalPct);
            return result;
        } catch (Exception e) {
            System.err.println("Authentication Failed (GET /api/settings): " + e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Token");
        }
    }

    @PostMapping
    public Map<String, Object> saveSetting(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> body) {
        try {
            String currentUserId = authService.verifyTokenAndGetUserId(authHeader);

            Integer goalPct = body.get("goalPct") != null ? ((Number) body.get("goalPct")).intValue() : null;

            UserSetting setting = userSettingRepository.findByUserId(currentUserId)
                    .orElseGet(() -> {
                        UserSetting s = new UserSetting();
                        s.setUserId(currentUserId);
                        return s;
                    });

            setting.setGoalPct(goalPct);
            userSettingRepository.save(setting);

            Map<String, Object> result = new HashMap<>();
            result.put("goalPct", goalPct);
            return result;
        } catch (Exception e) {
            System.err.println("Authentication Failed (POST /api/settings): " + e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Token");
        }
    }
}
