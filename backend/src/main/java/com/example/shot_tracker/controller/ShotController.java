package com.example.shot_tracker.controller;

import com.example.shot_tracker.model.ShotRecord;
import com.example.shot_tracker.repository.ShotRepository;
import com.example.shot_tracker.service.AuthService; 
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/shots")
@CrossOrigin(origins="*")
public class ShotController {
    @Autowired
    private ShotRepository shotRepository;

    @Autowired
    private AuthService authService;

    @GetMapping
    public List<ShotRecord> getRecords(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestHeader("Authorization") String authHeader){
        try{
            //トークンを検証してUIDを取得(なりすまし防止)
            String currentUserId = authService.verifyTokenAndGetUserId(authHeader);

            //dateがnullの場合は当日の日付を入れる
            if (date == null) date = LocalDate.now();
            return shotRepository.findByUserIdAndDate(currentUserId,date);
           
        }catch (Exception e){
            System.err.println("Authentication Failed (GET): " + e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Token");
        }
    }
    @PostMapping
    public ShotRecord createOrUpdateRecords(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ShotRecord requestRecord){
        
        try{
            //認証情報からuserIDを取得
            String currentUserId = authService.verifyTokenAndGetUserId(authHeader);
            requestRecord.setUserId(currentUserId);

            if (requestRecord.getDate() == null){
                requestRecord.setDate(LocalDate.now());
            }

            Optional<ShotRecord> existingRecord = shotRepository.findByUserIdAndDateAndZoneId(
                requestRecord.getUserId(),
                requestRecord.getDate(),
                requestRecord.getZoneId()
            );

            if (existingRecord.isPresent()){
                // パターンA：すでにあるのであれば上書き
                ShotRecord recordToUpdate = existingRecord.get();

                recordToUpdate.setMakes(requestRecord.getMakes());
                recordToUpdate.setAttempts(requestRecord.getAttempts());
                recordToUpdate.setCategory(requestRecord.getCategory());

                // Idを指定したsaveはJPAの仕組みとして「Update」となる。
                return shotRepository.save(recordToUpdate);
            }else{
                // パターンB：ないので新規作成（INSERT）
                return shotRepository.save(requestRecord);
            }
        } catch (Exception e) {
            System.err.println("Authentication Failed (GET): " + e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Token");
        }
    }
}

