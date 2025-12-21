package com.example.shot_tracker.controller;

import com.example.shot_tracker.model.ShotRecord;
import com.example.shot_tracker.repository.ShotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/shots")
@CrossOrigin(origins="http://localhost:5173")
public class ShotController {

    @Autowired
    private ShotRepository shotRepository;

    @GetMapping
    public List<ShotRecord> getRecords(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String userId) {

        if (date == null) date = LocalDate.now();
        String currentUserId = (userId != null) ? userId : "demo_user";

        return shotRepository.findByUserIdAndDate(currentUserId, date);
    }

    @PostMapping
    public ShotRecord createOrUpdateRecords(@RequestBody ShotRecord requestRecord) {
        if (requestRecord.getUserId() == null) {
            requestRecord.setUserId("demo_user");
        }
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
    }
}
