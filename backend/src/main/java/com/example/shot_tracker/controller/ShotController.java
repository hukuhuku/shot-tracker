package com.example.shot_tracker.controller;

import com.example.shot_tracker.model.ShotRecord;
import com.example.shot_tracker.repository.ShotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/shots")
@CrossOrigin(origins="http://localhost:5173")
public class ShotController {

    @Autowired
    private ShotRepository shotRepository;

    @GetMapping
    public List<ShotRecord> getAllShots() {
        return shotRepository.findAll();
    }

    @PostMapping
    public ShotRecord createShot(@RequestBody ShotRecord shotRecord) {
        if (shotRecord.getId() == null) {
            shotRecord.setUserId("demo_user");
        }

        return shotRepository.save(shotRecord);
    }
}
