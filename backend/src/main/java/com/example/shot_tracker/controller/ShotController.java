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
@CrossOrigin(origins="https://shot-tracker-theta.vercel.app/")
public class ShotController {
    @Autowired
    private ShotRepository shotRepository;

    @Autowired
    private AuthService authService;

    @GetMapping
    public List<ShotRecord> getRecords(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start_date,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end_date,
            @RequestHeader("Authorization") String authHeader){
        try{
            //トークンを検証してUIDを取得(なりすまし防止)
            String currentUserId = authService.verifyTokenAndGetUserId(authHeader);

            // 1.dateが指定されている場合はその日のデータを返す
            if (date != null) {
                return shotRepository.findByUserIdAndDate(currentUserId,date);

            // 2. start_dateが指定されているときはstart_date~end_dateのデータを返す
            }else if (start_date != null) {
                // 2.a end_dateがNULLの場合は当日=end_dateとする
                if (end_date == null){end_date = LocalDate.now();}
                return shotRepository.findByUserIdAndDateBetween(currentUserId,start_date,end_date);

            // 3. 何も指定がないときはそのユーザーのすべてのデータを返す
            }else {
                return shotRepository.findByUserId(currentUserId);
            }
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

